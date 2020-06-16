import cv2
import numpy
import struct
from sys import argv


MIN_HEADER_LENGTH = 8


def draw_image(image):
	image_arr = numpy.zeros([image['height'], image['width'], 3], dtype=numpy.uint8)
	
	pixel_index = 0
	# if there are 16 or fewer colors in the palette, each byte holds two pixels
	if image["color_count"] <= 16:
		for i in range(image["data_size"]):
			row1 = pixel_index // image['width']
			column1 = pixel_index % image['width']
			row2 = (pixel_index + 1) // image['width']
			column2 = (pixel_index + 1) % image['width']
			pixel_data = image['data'][i]
			try:
				r1, g1, b1 = image["colors"][pixel_data & 0xF]
			except IndexError:
				print(f"color out of bounds in image index {image['index']}")
				r1, g1, b1 = (0,0,0)
			try:
				r2, g2, b2 = image["colors"][pixel_data >> 4]
			except IndexError:
				print(f"color out of bounds in image index {image['index']}")
				r2, g2, b2 = (0,0,0)
			image_arr[row1][column1][0] = r1
			image_arr[row1][column1][1] = g1
			image_arr[row1][column1][2] = b1
			image_arr[row2][column2][0] = r2
			image_arr[row2][column2][1] = g2
			image_arr[row2][column2][2] = b2
			pixel_index += 2
			
	# if there are more than 16 colors, each byte holds one pixel
	else:
		for i in range(image["data_size"]):
			row = pixel_index // image['width']
			column = pixel_index % image['width']
			pixel_data = image['data'][i]
			r, g, b = image['colors'][pixel_data]
			image_arr[row][column][0] = r
			image_arr[row][column][1] = g
			image_arr[row][column][2] = b
			pixel_index += 1
	
	return image_arr


if len(argv) < 2:
	print("usage: python3 extract.py <rom_dump.bin>")
	exit()

# read in the binary
rom_path = argv[1]
f = open(rom_path, 'rb')
data = f.read()
f.close()

# scan the binary for images
length = len(data)
i = 0
images = []
while i < length - 10:
	# check for image header
	if data[i] == 0x0 and data[i+1] == 0x0 and \
	data[i+2] > 0x0 and data[i+3] > 0x0 and \
	data[i+5] == 0x0 and data[i+6] == 0x1 and \
	data[i+7] == 0xFF:
		image = {}
		image["index"] = i
		# extract info from header
		image["header"] = data[i:i+MIN_HEADER_LENGTH]
		image["width"] = image["header"][2]
		image["height"] = image["header"][3]
		image["color_count"] = image["header"][4]
		i += MIN_HEADER_LENGTH
		
		# extract color palette info from header
		image["colors"] = []
		color_section_length = image["color_count"] * 2  # each color is 2 bytes long (16-bit colors)
		for j in range(0, color_section_length, 2):
			color_index = i + j
			color_bytes = data[color_index:color_index+2]
			# convert bytes to little-endian short
			color16 = struct.unpack('<H', color_bytes)[0]
			# 16-bit->24-bit color conversion stolen from MyMeets
			# https://tamatown.com/downloads/
			blue = ((color16 & 0xF800) >> 11) * 255 / 31;
			green = ((color16 & 0x7E0) >> 5) * 255 / 63;
			red = (color16 & 0x1F) * 255 / 31;
			image["colors"].append((red, green, blue))
		i += color_section_length
		
		# extract the image itself
		image["data_size"] = image["width"] * image["height"]
		if image["color_count"] <= 16:
			# images with fewer colors are compressed differently.
			# 16 colors can be represented using only 4 bits, so one byte can hold two pixels
			image["data_size"] //= 2
		image["data"] = data[i:i+image["data_size"]]
		
		images.append(image)
		i += image["data_size"]
	else:
		i += 1

print(f"found {len(images)} images total")
for i, img in enumerate(images):
	img2 = draw_image(img)
	cv2.imwrite(f"{i}.jpg", img2)

"""
# scale the image up for easier viewing
scale = 8
resized = cv2.resize(img2, (img['width'] * scale, img['height'] * scale), interpolation=cv2.INTER_NEAREST)
cv2.imshow("test", resized)
cv2.waitKey()
"""
