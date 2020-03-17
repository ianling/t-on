'use strict';

function $(selector) {
    return document.querySelector(selector);
}

function byteToHex(byte) {
    const hex = byte.toString(16);
    return hex.length > 1 ? hex : '0' + hex;
}

function byteToChar(byte) {
    return byte < 32 || byte > 126 ? '.' : String.fromCharCode(byte);
}

function bytesToHex(bytes, width) {
    let out = '';
    for (let row = 0; row < bytes.length / width; row++) {
        const slice = Array.from(bytes.slice(row * width, (row + 1) * width));

        out += slice.map(byteToHex).join(' ') + '   ';
        out += slice.map(byteToChar).join('') + '\n'
    }
    return out;
}

function findFirstImageHeader(bytes) {
    let out = '**HEADER NOT FOUND**';
    for (let i = 0; i < bytes.length - 10; i++) {
        if (bytes[i] === 0        /* magic  */
            && bytes[i+1] === 0   /* magic  */
            && bytes[i+2] > 0     /* width  */
            && bytes[i+3] > 0     /* height */
            && bytes[i+5] === 0   /* magic? */
            && bytes[i+6] === 1   /* magic? */
            && bytes[i+7] === 255 /* magic? */
        ) {
            const varlen = bytes[i+4]; /* variable part len */
            const header = Array.from(bytes.slice(i, i + 8 + varlen*2));

            out = 'width:    ' + header[2] + '\n';
            out += 'height:   ' + header[3] + '\n';
            out += 'varlen:   ' + header[4] + '\n';
            out += 'variable: ' + header.slice(8).map(byteToHex).join(' ') + '\n';
            return out;
        }
    }
    return out;
}

async function init() {
    const canvas = $('#preview');
    const preview = canvas.getContext('2d');

    function fixDPI() {
        const dpi = window.devicePixelRatio;
        const cs = getComputedStyle(canvas);
        const width = cs.getPropertyValue('width').slice(0, -2);
        const height = cs.getPropertyValue('height').slice(0, -2);
        canvas.setAttribute('width', width*dpi);
        canvas.setAttribute('height', height*dpi);
    }

    fixDPI();

    function clearPreview() {
        preview.fillStyle = '#f0f';
        preview.fillRect(0, 0, canvas.width, canvas.height);
    }

    clearPreview();

    const inputFile = $('#input-file');
    const inputStart = $('#input-start');
    const inputSize = $('#input-size');
    const imageWidth = $('#image-width');
    const hexview = $('#hexview');
    const imageHeader = $('#image-header');

    let file = null;
    let start = parseInt(inputStart.value);
    let size = parseInt(inputSize.value);
    let width = parseInt(imageWidth.value);

    async function updatePreview() {
        clearPreview();

        if (file === null || size < 1 || width < 1) {
            return;
        }

        const slice = file.slice(start, start + size);
        const buffer = await slice.arrayBuffer()
        const bytes = new Uint8Array(buffer);
        const xscale = 6; // uint
        const yscale = 4; // uint

        const img = preview.createImageData(
            width * xscale, 
            Math.ceil(bytes.length / width) * yscale,
        );
        for (let i = 0, b = bytes[i]; i < bytes.length; b = bytes[++i]) {
            for (let xs = 0; xs < xscale; xs++) {
                for (let ys = 0; ys < yscale; ys++) {
                    const row = Math.floor(i / width) * yscale + ys;
                    const col = (i % width) * xscale + xs;
                    const idx = 4*(row*width*xscale + col);

                    img.data[ idx + 0 ] = b;
                    img.data[ idx + 1 ] = b;
                    img.data[ idx + 2 ] = b;
                    img.data[ idx + 3 ] = 255;
                }
            }
        }
        preview.putImageData(img, 0, 0);

        hexview.value = bytesToHex(bytes, width);
        imageHeader.value = findFirstImageHeader(bytes);
    }

    inputFile.addEventListener('change', e => {
        file = e.target.files[0];
        updatePreview();
    });

    inputStart.addEventListener('change', e => {
        start = parseInt(e.target.value);
        updatePreview();
    });

    inputSize.addEventListener('change', e => {
        size = parseInt(e.target.value);
        updatePreview();
    });

    imageWidth.addEventListener('change', e => {
        width = parseInt(e.target.value);
        updatePreview();
    });

    $('#btn-start-back-10rows').addEventListener('click', () => {
        if (start > 0 && width > 0) {
            start = Math.max(0, start - 10*width);
            inputStart.value = start;
            updatePreview();
        }
    });

    $('#btn-start-back-row').addEventListener('click', () => {
        if (start > 0 && width > 0) {
            start = Math.max(0, start - width);
            inputStart.value = start;
            updatePreview();
        }
    });

    $('#btn-start-fwd-row').addEventListener('click', () => {
        if (width > 0) {
            start += width;
            inputStart.value = start;
            updatePreview();
        }
    });

    $('#btn-start-fwd-10rows').addEventListener('click', () => {
        if (width > 0) {
            start += 10*width;
            inputStart.value = start;
            updatePreview();
        }
    });

    $('#btn-size-align-to-width').addEventListener('click', () => {
        if (width > 0 && size % width > 0) {
            size += width - (size % width);
            inputSize.value = size;
            updatePreview();
        }
    });

    $('#btn-size-add-10rows').addEventListener('click', () => {
        if (width > 0) {
            size += 10*width;
            inputSize.value = size;
            updatePreview();
        }
    });

    $('#btn-size-add-row').addEventListener('click', () => {
        if (width > 0) {
            size += width;
            inputSize.value = size;
            updatePreview();
        }
    });

    $('#btn-size-remove-10rows').addEventListener('click', () => {
        if (width > 0 && size > 0) {
            size = Math.max(0, size - 10*width);
            inputSize.value = size;
            updatePreview();
        }
    });

    $('#btn-size-remove-row').addEventListener('click', () => {
        if (width > 0 && size > 0) {
            size = Math.max(0, size - width);
            inputSize.value = size;
            updatePreview();
        }
    });

    $('#btn-width-inc').addEventListener('click', () => {
        if (width > 0) {
            width *= 2;
            imageWidth.value = width;
            updatePreview();
        }
    });

    $('#btn-width-dec').addEventListener('click', () => {
        if (width > 1) {
            width = Math.floor(width / 2);
            imageWidth.value = width;
            updatePreview();
        }
    });
}
window.addEventListener('DOMContentLoaded', init);
