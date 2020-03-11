'use strict';

async function init() {
    const canvas = document.getElementById('preview');
    const preview = canvas.getContext('2d');

    function clearPreview() {
        preview.fillStyle = '#f0f';
        preview.fillRect(0, 0, canvas.width, canvas.height);
    }

    clearPreview();

    const inputFile = document.getElementById('input-file');
    const inputStart = document.getElementById('input-start');
    const inputSize = document.getElementById('input-size');
    const imageWidth = document.getElementById('image-width');

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

        const img = preview.createImageData(width, Math.ceil(bytes.length / width));
        for (let i = 0, b = bytes[i]; i < bytes.length; b = bytes[++i]) {
            img.data[ i*4 ] = b;
            img.data[ i*4 + 1 ] = b;
            img.data[ i*4 + 2 ] = b;
            img.data[ i*4 + 3 ] = 255;
        }
        preview.putImageData(img, 0, 0);
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
}
window.addEventListener('DOMContentLoaded', init);
