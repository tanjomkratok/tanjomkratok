const bookingForm = document.getElementById("bookingForm");
const statusText = document.getElementById("status");

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(bookingForm);
  const name = formData.get("name");
  const channel = formData.get("channel");
  const datetime = formData.get("datetime");

  statusText.classList.add("success");
  statusText.textContent = `รับคำขอนัดหมายของคุณ ${name} เรียบร้อยแล้ว ทีมงานจะยืนยันคิวผ่าน ${channel} ภายใน 1 วันทำการ (เวลาที่เลือก: ${datetime})`;

  bookingForm.reset();
});
