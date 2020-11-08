export function drawPoint(ctx, y, x) {
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, 2 * Math.PI);
  ctx.fillStyle = 'chartreuse';
  ctx.fill();
}

export function drawLine(ctx, y1, x1, y2, x2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'chartreuse';
  ctx.stroke();
}
