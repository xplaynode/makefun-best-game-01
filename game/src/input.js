// Keyboard and mouse state. Mouse positions are converted from page
// coordinates into arena coordinates using the canvas letterbox rect,
// so aiming stays correct at any window size.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 640;
    this.mouseY = 200;
    this.mouseDown = false;
    this.clicked = false;
    this.enabled = true;

    window.addEventListener("keydown", (event) => {
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.mouseDown = false;
    });

    canvas.addEventListener("mousemove", (event) => {
      const point = this.toArena(event.clientX, event.clientY);
      this.mouseX = point.x;
      this.mouseY = point.y;
    });
    canvas.addEventListener("mousedown", (event) => {
      const point = this.toArena(event.clientX, event.clientY);
      this.mouseX = point.x;
      this.mouseY = point.y;
      this.mouseDown = true;
      this.clicked = true;
    });
    window.addEventListener("mouseup", () => {
      this.mouseDown = false;
    });
  }

  toArena(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  wasPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  axisX() {
    let x = 0;
    if (this.down("KeyA", "ArrowLeft")) x -= 1;
    if (this.down("KeyD", "ArrowRight")) x += 1;
    return x;
  }

  axisY() {
    let y = 0;
    if (this.down("KeyW", "ArrowUp")) y -= 1;
    if (this.down("KeyS", "ArrowDown")) y += 1;
    return y;
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
