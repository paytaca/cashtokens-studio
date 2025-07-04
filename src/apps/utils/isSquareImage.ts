export default async (f: File) => {
  return await new Promise((res) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = String(e.target?.result);
      img.onload = () => {
        if (img.width === img.height) {
          res(true);
        } else {
          res(false);
        }
      };
    };
    if (f) {
      reader.readAsDataURL(f);
    }
  });
};
