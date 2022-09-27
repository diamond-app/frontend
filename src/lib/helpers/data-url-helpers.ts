export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    const rejectError = new Error("There was a problem reading the file data");
    fileReader.readAsDataURL(file);
    fileReader.onload = () => {
      if (fileReader.result) {
        resolve(fileReader.result.toString());
      } else {
        reject(rejectError);
      }
    };
    fileReader.onerror = () => reject(rejectError);
    fileReader.onabort = () => reject(rejectError);
  });
}

export function dataURLtoFile(dataurl: string, filename: string): File {
  let arr = dataurl.split(",");
  let mime = arr[0]?.match(/:(.*?);/)?.[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
