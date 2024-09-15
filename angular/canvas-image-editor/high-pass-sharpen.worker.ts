/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {

  console.log('HighPassSharpen Worker: Message received from main script');
  const [height, width, imageData, output, amount] = data;


  const orgData = imageData.data;
  const outputData = output.data;
  // Create a copy of the original image data for high-pass filtering
  const highPassData = new Float32Array(orgData.length);

  // Calculate high-pass filter
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // R, G, B channels
        const i = (y * width + x) * 4 + c;
        const originalValue = orgData[i];
        const averageValue =
          (orgData[((y - 1) * width + x - 1) * 4 + c] +
            orgData[((y - 1) * width + x) * 4 + c] +
            orgData[((y - 1) * width + x + 1) * 4 + c] +
            orgData[(y * width + x - 1) * 4 + c] +
            orgData[(y * width + x + 1) * 4 + c] +
            orgData[((y + 1) * width + x - 1) * 4 + c] +
            orgData[((y + 1) * width + x) * 4 + c] +
            orgData[((y + 1) * width + x + 1) * 4 + c]) / 8;

        highPassData[i] = originalValue - averageValue; // High-pass filter result
      }
    }
  }

  // Apply high-pass filter to sharpen the image
  for (let i = 0; i < orgData.length; i += 4) {
    outputData[i] = Math.min(255, Math.max(0, orgData[i] + amount * highPassData[i]));
    outputData[i + 1] = Math.min(255, Math.max(0, orgData[i + 1] + amount * highPassData[i + 1]));
    outputData[i + 2] = Math.min(255, Math.max(0, orgData[i + 2] + amount * highPassData[i + 2]));
    outputData[i + 3] = orgData[i + 3]; // Preserve alpha channel
  }

  postMessage(outputData);
});
