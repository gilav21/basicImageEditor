/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  console.log('Sharpen Worker: Message received from main script');
  const [height, width, imageData, output] = data;


  const weight = 1; // Sharpening weight

  // Convolution matrix for a simple sharpen filter
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  const side = Math.round(Math.sqrt(kernel.length));
  const halfSide = Math.floor(side / 2);

  const orgData = imageData.data;
  const outputData = output.data;

   for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let ky = -halfSide; ky <= halfSide; ky++) {
          for (let kx = -halfSide; kx <= halfSide; kx++) {
            const px = x + kx;
            const py = y + ky;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const pos = (py * width + px) * 4;
              const weight = kernel[(ky + halfSide) * side + (kx + halfSide)];
              r += orgData[pos] * weight;
              g += orgData[pos + 1] * weight;
              b += orgData[pos + 2] * weight;
              a += orgData[pos + 3] * weight;
            }
          }
        }
        const i = (y * width + x) * 4;
        outputData[i] = r;
        outputData[i + 1] = g;
        outputData[i + 2] = b;
        outputData[i + 3] = a;
      }
    }

  postMessage(outputData);
});
