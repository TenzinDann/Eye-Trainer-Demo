class Settings {
  constructor() {
    this.showGrid = true;
    this.darkmode = false;
    this.ball_colour = "red";
    this.ball_shading_colour = "red";
    this.ball_outline_colour = "red";
    this.dotPalette = null;
  }

  setDarkmode(value) {
    this.darkmode = value;
  }

  setDotPalette(palette) {
    this.dotPalette = palette;
  }
}

const DOT_PALETTE = {
  dark: {
    primary: "#00d610",
    secondary: "#01a108",
    outline: "transparent",
  },
  light: {
    primary: "#d42020",
    secondary: "#a31919",
    outline: "transparent",
  },
};

const STAGE_THEME = {
  dark: {
    base: "#040713",
    line: "rgba(255,255,255,0.55)",
  },
  light: {
    base: "#f1f1f4",
    line: "rgba(0,0,0,0.95)",
  },
};

function resolveAssetPath(path) {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}

function getModeDotPalette(settings) {
  if (settings.dotPalette) {
    return settings.darkmode ? settings.dotPalette.dark : settings.dotPalette.light;
  }
  return settings.darkmode ? DOT_PALETTE.dark : DOT_PALETTE.light;
}

function applyBallPalette(settings, palette) {
  settings.ball_colour = palette.primary;
  settings.ball_shading_colour = palette.secondary;
  settings.ball_outline_colour = palette.outline;
}

function getStageTheme(settings) {
  return settings.darkmode ? STAGE_THEME.dark : STAGE_THEME.light;
}

function drawAlignedSegment(ctx, x1, y1, x2, y2, lineWidth, color) {
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.beginPath();
  const adjust = lineWidth % 2 === 0 ? 0 : 0.5;
  ctx.moveTo(x1 + adjust, y1 + adjust);
  ctx.lineTo(x2 + adjust, y2 + adjust);
  ctx.stroke();
}

class CanvasBP {
  constructor(levelName, canvas, ctx, onFinished, settings) {
    this.level_name = levelName;
    this.canvas = canvas;
    this.ctx = ctx;
    this.widthHeightRat = window.innerWidth && window.innerHeight ? window.innerWidth / window.innerHeight : 2.5;
    this.onFinished = onFinished;
    this.settings = settings;
    this.animationId = null;
    this._lastCssWidth = 0;
    this._lastCssHeight = 0;
    this._lastPixelRatio = 0;
    this._bgCache = null;
    this._bgCacheKey = "";
    this.active = false;

    this.animate = this.animate.bind(this);
  }

  _fixScale() {
    const cssWidth = Math.max(1, Math.floor(window.innerWidth));
    const cssHeight = Math.max(1, Math.floor(window.innerHeight));
    const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    if (
      cssWidth !== this._lastCssWidth ||
      cssHeight !== this._lastCssHeight ||
      pixelRatio !== this._lastPixelRatio
    ) {
      const width = Math.max(1, Math.round(cssWidth * pixelRatio));
      const height = Math.max(1, Math.round(cssHeight * pixelRatio));
      this.ctx.canvas.width = width;
      this.ctx.canvas.height = height;
      this.ctx.canvas.style.width = `${cssWidth}px`;
      this.ctx.canvas.style.height = `${cssHeight}px`;
      this._lastCssWidth = cssWidth;
      this._lastCssHeight = cssHeight;
      this._lastPixelRatio = pixelRatio;
      this.widthHeightRat = cssWidth / cssHeight;
      if (typeof this.onCanvasResize === "function") {
        this.onCanvasResize(width, height, pixelRatio);
      }
      this._bgCache = null;
      this._bgCacheKey = "";
    }
  }

  _drawLine(x1, y1, x2, y2) {
    if (!this.settings.showGrid) {
      return;
    }

    const theme = getStageTheme(this.settings);
    drawAlignedSegment(this.ctx, x1, y1, x2, y2, this.canvas.width / 700, theme.line);
  }

  _drawCircle(x, y, color, outlineColor, radius) {
    this.ctx.strokeStyle = outlineColor;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.stroke();
  }

  _drawCircleWithShading(x, y, topColor, bottomColor, outlineColor, radius) {
    const gradient = this.ctx.createLinearGradient(x, y - radius, x, y + radius);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(0.5, topColor);
    gradient.addColorStop(1, bottomColor);

    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = outlineColor;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
  }

  start_lvl() {
    this.active = true;
    this.animationId = requestAnimationFrame(this.animate);
  }

  stop_lvl() {
    this.active = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  updateTime() {}

  updateUI() {
    this._fixScale();
    this._drawStageBackground();
  }

  _drawStageBackground() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const theme = getStageTheme(this.settings);
    const key = `${width}x${height}:${this.settings.darkmode ? "dark" : "light"}`;

    if (this._bgCache && this._bgCacheKey === key) {
      this.ctx.drawImage(this._bgCache, 0, 0);
      return;
    }

    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext("2d");
    if (!bgCtx) {
      return;
    }

    bgCtx.fillStyle = theme.base;
    bgCtx.fillRect(0, 0, width, height);

    this._bgCache = bgCanvas;
    this._bgCacheKey = key;
    this.ctx.drawImage(bgCanvas, 0, 0);
  }

  animate() {
    if (!this.active) {
      return;
    }
    this.updateTime();
    this.updateUI();
    if (!this.active) {
      return;
    }
    this.animationId = requestAnimationFrame(this.animate);
  }

  finished_lvl() {
    if (typeof this.onFinished === "function") {
      this.onFinished();
    }
  }
}

class MovingCircle extends CanvasBP {
  constructor(levelName, canvas, ctx, ballSpeed, shouldReverse, settings, onFinished) {
    super(levelName, canvas, ctx, onFinished, settings);

    this.ballSpeed = ballSpeed;
    this.totalTime = 10000;
    this.lastTime = null;
    this.t = 0;

    this.shouldReverse = shouldReverse;
    this.reverse = false;
  }

  dtFactor(dt) {
    const ratio = (this.totalTime - this.t) / this.totalTime;
    return dt * (-500 * Math.pow(ratio - 0.5, 10) + 0.5);
  }

  updateTime() {
    const currentTime = performance.now();
    if (this.lastTime == null) {
      this.lastTime = currentTime;
      return;
    }
    const rawDt = currentTime - this.lastTime;
    const safeDt = Math.max(0, Math.min(50, rawDt));
    const dt = this.dtFactor(safeDt);
    this.lastTime = currentTime;

    const timeChange = (dt / 1000) * this.ballSpeed;

    if (this.reverse && this.shouldReverse) {
      this.t -= timeChange;
    } else {
      this.t += timeChange;
    }

    if (this.t >= this.totalTime) {
      this.t = this.totalTime;
      this.reverse = true;
      if (!this.shouldReverse) {
        this.t = 0;
        this.finished_lvl();
      }
    } else if (this.t <= 0) {
      this.t = 0;
      this.reverse = false;
      this.finished_lvl();
    }
  }

  start_lvl() {
    this.t = 0;
    this.lastTime = performance.now();
    super.start_lvl();
  }
}

class LinearCircle extends MovingCircle {
  constructor(levelName, canvas, ctx, canvasRatioPoints, ballSpeed, shouldReverse, settings, onFinished) {
    super(levelName, canvas, ctx, ballSpeed, shouldReverse, settings, onFinished);

    this.canvas_ratio_points = canvasRatioPoints;
    this.points_array = [];
    this.timeAtPoints = [];

    this.createParameterFunc();
    this.onCanvasResize = () => {
      this.createParameterFunc();
    };
  }

  fixCoordinates() {
    this.points_array = this.canvas_ratio_points.map((point) => ({
      x: point.x * this.canvas.width,
      y: point.y * this.canvas.height,
    }));
  }

  drawGraph() {
    for (let i = 0; i < this.points_array.length - 1; i += 1) {
      this._drawLine(
        this.points_array[i].x,
        this.points_array[i].y,
        this.points_array[i + 1].x,
        this.points_array[i + 1].y
      );
    }
  }

  updateUI() {
    super.updateUI();

    this.fixCoordinates();
    this.drawGraph();

    const ans = this.func(this.t);
    this._drawCircleWithShading(
      ans.x,
      ans.y,
      this.settings.ball_colour,
      this.settings.ball_shading_colour,
      this.settings.ball_outline_colour,
      this.canvas.width / 60
    );
  }

  createParameterFunc() {
    const whRat = this.widthHeightRat;

    const distance = (point1, point2) => {
      return Math.sqrt(
        Math.pow(point1.y - point2.y, 2) +
          Math.pow(point1.x * whRat - point2.x * whRat, 2)
      );
    };

    let curTime = 0;
    let totalDistance = 0;

    for (let i = 0; i < this.canvas_ratio_points.length - 1; i += 1) {
      totalDistance += distance(this.canvas_ratio_points[i], this.canvas_ratio_points[i + 1]);
    }

    this.timeAtPoints = [0];

    for (let i = 0; i < this.canvas_ratio_points.length - 1; i += 1) {
      const dist = distance(this.canvas_ratio_points[i], this.canvas_ratio_points[i + 1]);
      const timeEx = (dist / totalDistance) * this.totalTime;
      this.timeAtPoints.push(timeEx + curTime);
      curTime += timeEx;
    }
  }

  getNextPoint(currentTime) {
    for (let i = 1; i < this.timeAtPoints.length; i += 1) {
      if (currentTime <= this.timeAtPoints[i]) {
        return i;
      }
    }
    return this.timeAtPoints.length - 1;
  }

  dtFactor(dt) {
    const i = this.getNextPoint(this.t);
    const denominator = this.timeAtPoints[i] - this.timeAtPoints[i - 1] || 1;
    const ratio = (this.t - this.timeAtPoints[i - 1]) / denominator;

    return dt * (-500 * Math.pow(ratio - 0.5, 10) + 0.5);
  }

  func(t) {
    const i = this.getNextPoint(t);
    const denominator = this.timeAtPoints[i] - this.timeAtPoints[i - 1] || 1;
    const ratio = (t - this.timeAtPoints[i - 1]) / denominator;

    return {
      x: (this.points_array[i].x - this.points_array[i - 1].x) * ratio + this.points_array[i - 1].x,
      y: (this.points_array[i].y - this.points_array[i - 1].y) * ratio + this.points_array[i - 1].y,
    };
  }
}

class AspectLockedLinearCircle extends LinearCircle {
  fixCoordinates() {
    const size = Math.min(this.canvas.width, this.canvas.height) * 0.82;
    const offsetX = (this.canvas.width - size) / 2;
    const offsetY = (this.canvas.height - size) / 2;
    this.points_array = this.canvas_ratio_points.map((point) => ({
      x: offsetX + point.x * size,
      y: offsetY + point.y * size,
    }));
  }

  createParameterFunc() {
    const distance = (point1, point2) => {
      return Math.sqrt(
        Math.pow(point1.y - point2.y, 2) +
          Math.pow(point1.x - point2.x, 2)
      );
    };

    let curTime = 0;
    let totalDistance = 0;

    for (let i = 0; i < this.canvas_ratio_points.length - 1; i += 1) {
      totalDistance += distance(this.canvas_ratio_points[i], this.canvas_ratio_points[i + 1]);
    }

    this.timeAtPoints = [0];

    for (let i = 0; i < this.canvas_ratio_points.length - 1; i += 1) {
      const dist = distance(this.canvas_ratio_points[i], this.canvas_ratio_points[i + 1]);
      const timeEx = (dist / totalDistance) * this.totalTime;
      this.timeAtPoints.push(timeEx + curTime);
      curTime += timeEx;
    }
  }
}

class ParametricCircle extends MovingCircle {
  constructor(levelName, canvas, ctx, ballSpeed, shouldReverse, fx, fy, fxDraw, fyDraw, settings, onFinished) {
    super(levelName, canvas, ctx, ballSpeed, shouldReverse, settings, onFinished);

    this.fx = fx;
    this.fy = fy;
    this.fx_draw = fxDraw;
    this.fy_draw = fyDraw;

    this.savedPoints = this.savePoints(this.fx, this.fy, this.range(0, 2 * Math.PI, 2000));
    this.drawPoints = this.savePoints(this.fx_draw, this.fy_draw, this.range(0, 2 * Math.PI, 2000));
  }

  savePoints(fx, fy, values) {
    return values.map((t) => ({ x: fx(t), y: fy(t) }));
  }

  drawParametricCurve(xRat, yRat) {
    for (let i = 0; i < this.drawPoints.length - 1; i += 1) {
      const x1 = (xRat / 2) * this.drawPoints[i].x + xRat;
      const y1 = (xRat / 2) * this.drawPoints[i].y + yRat;
      const x2 = (xRat / 2) * this.drawPoints[i + 1].x + xRat;
      const y2 = (xRat / 2) * this.drawPoints[i + 1].y + yRat;
      this._drawLine(x1, y1, x2, y2);
    }
  }

  range(low, high, n) {
    const delta = high - low;
    const step = delta / n;
    const arr = [];
    for (let i = 0; i <= n; i += 1) {
      arr.push(low + step * i);
    }
    return arr;
  }

  updateUI() {
    super.updateUI();

    const xRat = this.canvas.width / 2;
    const yRat = this.canvas.height / 2;
    const width = xRat * 2;
    const height = yRat * 2;

    this.drawParametricCurve(xRat, yRat);

    if (this.level_name === "Circle") {
      this._drawCircle(
        (width * 1) / 2,
        (height * 10) / 50,
        "transparent",
        this.settings.darkmode ? "white" : "black",
        this.canvas.width / 36
      );
    }

    const ans = this.func(this.t, xRat, yRat);
    this._drawCircleWithShading(
      ans.x,
      ans.y,
      this.settings.ball_colour,
      this.settings.ball_shading_colour,
      "transparent",
      this.canvas.width / 60
    );
  }

  func(t, xRat, yRat) {
    const tInPi = 2 * Math.PI * (t / this.totalTime);
    return {
      x: (xRat / 2) * this.fx(tInPi) + xRat,
      y: (xRat / 2) * this.fy(tInPi) + yRat,
    };
  }
}

class FlickWorker extends CanvasBP {
  constructor(levelName, canvas, ctx, ballPositions, timeNextFlick, reverse, settings, onFinished) {
    super(levelName, canvas, ctx, onFinished, settings);

    this.canvas_ball_rat = ballPositions;
    this.ball_positions = [];

    this.startTimeNextFlick = timeNextFlick;
    this.timeNextFlick = timeNextFlick;
    this.t = 0;
    this.total_time = this.canvas_ball_rat.length * timeNextFlick;
    this.lastTime = performance.now();

    this.reverse = reverse;
    this.dir = 1;
  }

  fixCoordinates() {
    this.ball_positions = this.canvas_ball_rat.map((point) => ({
      x: point.x * this.canvas.width,
      y: point.y * this.canvas.height,
    }));
  }

  drawLinesBetweenBalls() {
    for (let i = 0; i < this.ball_positions.length - 1; i += 1) {
      this._drawLine(
        this.ball_positions[i].x,
        this.ball_positions[i].y,
        this.ball_positions[i + 1].x,
        this.ball_positions[i + 1].y
      );
    }
  }

  drawBalls() {
    const xcanvas = this.canvas.width;
    const radius = xcanvas / 35;
    const outline = this.settings.darkmode ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.45)";
    for (let i = 0; i < this.ball_positions.length; i += 1) {
      this._drawCircle(
        this.ball_positions[i].x,
        this.ball_positions[i].y,
        "#ffffff",
        outline,
        radius
      );
    }
  }

  drawFlickBall(i) {
    if (i < 0 || i >= this.ball_positions.length) {
      return;
    }
    const xcanvas = this.canvas.width;
    const palette = getModeDotPalette(this.settings);
    this._drawCircleWithShading(
      this.ball_positions[i].x,
      this.ball_positions[i].y,
      palette.primary,
      palette.secondary,
      palette.outline,
      xcanvas / 35
    );
  }

  updateTime() {
    const curTime = performance.now();
    if (this.lastTime == null) {
      this.lastTime = curTime;
      return;
    }
    const dt = Math.max(0, Math.min(80, curTime - this.lastTime));

    this.t += dt * this.dir;

    if (this.t >= this.total_time) {
      if (this.reverse) {
        this.t = this.total_time;
        this.dir = -1;
      } else {
        this.t = 0;
        this.finished_lvl();
      }
    }

    if (this.t <= 0 && this.dir < 0) {
      this.t = 0;
      this.dir = 1;
      this.finished_lvl();
    }

    this.lastTime = curTime;
  }

  updateUI() {
    super.updateUI();
    this.fixCoordinates();

    this.drawLinesBetweenBalls();
    this.drawBalls();

    const blueBallIndex = Math.min(Math.floor(this.t / this.timeNextFlick), this.ball_positions.length - 1);
    this.drawFlickBall(blueBallIndex);
  }

  start_lvl() {
    this.dir = 1;
    this.t = 0;
    this.lastTime = performance.now();

    this.timeNextFlick = this.startTimeNextFlick;
    this.total_time = this.canvas_ball_rat.length * this.timeNextFlick;

    super.start_lvl();
  }
}

class MultipleCirclesWorker extends CanvasBP {
  constructor(levelName, canvas, ctx, ballStartPositions, horizontal, speed, leftSide, rightSide, settings, onFinished) {
    super(levelName, canvas, ctx, onFinished, settings);

    this.ball_start_positions = ballStartPositions;
    this.ball_positions_canvas = this.ball_start_positions.map((point) => ({ ...point }));
    this.ball_positions = [];

    this.currentBall = 0;
    this.horizontal = horizontal;
    this.dir = null;
    this.sequenceDir = 1;

    this.leftSide = leftSide;
    this.rightSide = rightSide;

    this.speed = speed;
    this.lastTime = performance.now();

    this.setDir();
  }

  setDir() {
    const current = this.ball_positions_canvas[this.currentBall];
    if (!current) {
      this.dir = 1;
      return;
    }

    if (this.horizontal) {
      this.dir = current.x > 0.5 ? -1 : 1;
    } else {
      this.dir = current.y > 0.5 ? -1 : 1;
    }
  }

  nextBall() {
    if (!this.ball_positions_canvas[this.currentBall]) {
      return;
    }

    const side = this.dir === 1 ? this.rightSide : this.leftSide;

    if (this.horizontal) {
      this.ball_positions_canvas[this.currentBall].x = side;
    } else {
      this.ball_positions_canvas[this.currentBall].y = side;
    }

    const lastIndex = this.ball_positions_canvas.length - 1;

    if (this.sequenceDir === 1 && this.currentBall >= lastIndex) {
      this.sequenceDir = -1;
      this.currentBall = lastIndex;
      this.setDir();
      return;
    }

    if (this.sequenceDir === -1 && this.currentBall <= 0) {
      this.sequenceDir = 1;
      this.currentBall = 0;
      this.finished_lvl();
      this.setDir();
      return;
    }

    this.currentBall += this.sequenceDir;
    this.setDir();
  }

  fixCoordinates() {
    this.ball_positions = this.ball_positions_canvas.map((point) => ({
      x: point.x * this.canvas.width,
      y: point.y * this.canvas.height,
    }));
  }

  drawBalls() {
    const width = this.canvas.width / 45;
    const palette = getModeDotPalette(this.settings);
    for (let i = 0; i < this.ball_positions.length; i += 1) {
      this._drawCircleWithShading(
        this.ball_positions[i].x,
        this.ball_positions[i].y,
        palette.primary,
        palette.secondary,
        palette.outline,
        width
      );
    }
  }

  speedFactor(pos) {
    const rawRatio = (pos - this.leftSide) / (this.rightSide - this.leftSide);
    const ratio = Math.max(0, Math.min(1, rawRatio));
    return -250 * Math.pow(ratio - 0.5, 8) + 1;
  }

  outsideBounds() {
    const current = this.ball_positions_canvas[this.currentBall];
    if (!current) {
      return false;
    }

    if (this.horizontal) {
      return current.x >= this.rightSide || current.x <= this.leftSide;
    }

    return current.y >= this.rightSide || current.y <= this.leftSide;
  }

  updatePos() {
    const current = this.ball_positions_canvas[this.currentBall];
    if (!current) {
      return;
    }
    const dt = this.getDt();

    const pos = this.horizontal
      ? current.x
      : current.y;

    const speedMultiplier = this.speedFactor(pos);
    const rawDxy = (dt * speedMultiplier * this.speed * this.dir) / 1000000;
    const dxy = Math.max(-0.08, Math.min(0.08, rawDxy));

    if (this.horizontal) {
      current.x += dxy;
    } else {
      current.y += dxy;
    }
  }

  getDt() {
    const curTime = performance.now();
    const dt = Math.max(0, Math.min(50, curTime - this.lastTime));
    this.lastTime = curTime;
    return dt;
  }

  updateUI() {
    super.updateUI();
    this.fixCoordinates();
    this.drawBalls();
  }

  animate() {
    this.updatePos();
    if (this.outsideBounds()) {
      this.nextBall();
    }
    super.animate();
  }

  start_lvl() {
    this.ball_positions_canvas = this.ball_start_positions.map((point) => ({ ...point }));
    this.currentBall = 0;
    this.sequenceDir = 1;
    this.setDir();
    this.lastTime = performance.now();
    super.start_lvl();
  }
}

class RandomBall extends CanvasBP {
  constructor(levelName, canvas, ctx, settings, onFinished) {
    super(levelName, canvas, ctx, onFinished, settings);

    this.total_time = 15000;
    this.t = 0;
    this.lastTime = null;
    this.nextFinishAt = this.total_time;

    this.currentThousand = 1000;
    this.currentPos = { x: 0.5, y: 0.5 };
  }

  updateTime() {
    const curTime = performance.now();
    let dt = curTime - this.lastTime;
    if (dt >= 1000) {
      dt = 0;
    }

    this.t += dt;
    if (this.t >= this.nextFinishAt) {
      this.nextFinishAt += this.total_time;
      this.finished_lvl();
    }

    this.lastTime = curTime;
  }

  updateUI() {
    super.updateUI();
    const width = this.canvas.width;
    const height = this.canvas.height;
    const palette = getModeDotPalette(this.settings);

    this._drawCircleWithShading(
      this.currentPos.x * width,
      this.currentPos.y * height,
      palette.primary,
      palette.secondary,
      palette.outline,
      width / 50
    );
  }

  getNewBallPos() {
    return {
      x: Math.random() * 0.6 + 0.2,
      y: Math.random() * 0.8 + 0.1,
    };
  }

  updateBall() {
    if (this.t >= this.currentThousand) {
      this.currentPos = this.getNewBallPos();
      this.currentThousand += 1000;
    }
  }

  animate() {
    if (!this.active) {
      return;
    }
    this.updateBall();
    this.updateUI();
    this.updateTime();
    if (!this.active) {
      return;
    }
    this.animationId = requestAnimationFrame(this.animate);
  }

  start_lvl() {
    this.active = true;
    this.t = 0;
    this.nextFinishAt = this.total_time;
    this.currentThousand = 1000;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.animate);
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  diff(other) {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  scaled(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

class FreeBallWorker extends CanvasBP {
  constructor(levelName, canvas, ctx, settings, onFinished) {
    super(levelName, canvas, ctx, onFinished, settings);

    this.lastTime = null;
    this.stopTime = 20;

    this.position = new Vector(0.5, 0.5);
    this.target = this.getNewBallPos();
    this.speed = 0.34;

    this.totalT = 0;
  }

  incrementTotalT(dt) {
    this.totalT += dt;
    while (this.totalT >= this.stopTime) {
      this.totalT -= this.stopTime;
      this.finished_lvl();
    }
  }

  getNewBallPos() {
    return new Vector(
      Math.random() * 0.7 + 0.15,
      Math.random() * 0.8 + 0.1
    );
  }

  advancePosition(dtSeconds) {
    const toTarget = this.target.diff(this.position);
    const distance = toTarget.length();
    const maxStep = this.speed * dtSeconds;

    if (distance <= maxStep || distance === 0) {
      this.position = this.target;
      this.target = this.getNewBallPos();
      return;
    }

    const step = toTarget.scaled(maxStep / distance);
    this.position = this.position.add(step);
  }

  getNewPos() {
    const now = performance.now();
    if (this.lastTime == null) {
      this.lastTime = now;
      return;
    }

    const dtMs = Math.max(0, Math.min(50, now - this.lastTime));
    this.lastTime = now;
    const dtSeconds = dtMs / 1000;

    this.incrementTotalT(dtSeconds);
    this.advancePosition(dtSeconds);
  }

  convertToCanvasPos() {
    return {
      x: this.position.x * this.canvas.width,
      y: this.position.y * this.canvas.height,
    };
  }

  updateTime() {
    // Free ball uses its own time step in getNewPos().
  }

  drawBallShaders(centerX, centerY, radius) {
    const palette = getModeDotPalette(this.settings);
    const coreColor = palette.primary;
    const middleColor = palette.secondary;
    const rayEndColor = palette.secondary;

    const gradient = this.ctx.createLinearGradient(centerX, centerY - radius, centerX, centerY + radius);
    gradient.addColorStop(0, coreColor);
    gradient.addColorStop(0.3, coreColor);
    gradient.addColorStop(0.7, middleColor);
    gradient.addColorStop(1, rayEndColor);

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  updateUI() {
    super.updateUI();
    const pos = this.convertToCanvasPos();
    this.drawBallShaders(pos.x, pos.y, this.canvas.width / 50);
  }

  animate() {
    this.getNewPos();
    super.animate();
  }

  start_lvl() {
    this.lastTime = null;
    this.totalT = 0;
    this.position = new Vector(0.5, 0.5);
    this.target = this.getNewBallPos();
    this.speed = 0.34;
    super.start_lvl();
  }
}

class PVisionWorker extends CanvasBP {
  constructor(
    levelName,
    canvas,
    ctx,
    ballPosses,
    imageWhitemode,
    imageDarkmode,
    show1Ball,
    step,
    dx,
    dy,
    w,
    settings,
    onFinished,
    ballPositionsAreLocal = false,
    dotRadiusDivisor = 28,
    fixedDotRadiusDivisor = null
  ) {
    super(levelName, canvas, ctx, onFinished, settings);

    const pointsPerLoop = Math.max(1, ballPosses.length);
    this.total_time = Math.max(step, step * pointsPerLoop);
    this.t = 0;
    this.lastTime = null;

    this.currentThousand = step;
    this.step = step;
    this.nextFinishAt = this.total_time + this.step;
    this.currentBallIndex = 0;

    this.show1Ball = show1Ball;
    this.w = w;
    this.dx = dx;
    this.dy = dy;
    this.ballPosses = ballPosses;
    this.dotRadiusDivisor = dotRadiusDivisor > 0 ? dotRadiusDivisor : 28;
    this.fixedDotRadiusDivisor = fixedDotRadiusDivisor && fixedDotRadiusDivisor > 0
      ? fixedDotRadiusDivisor
      : null;
    if (ballPositionsAreLocal) {
      this.ballImageLocalPosses = ballPosses.map((point) => ({ x: point.x, y: point.y }));
    } else {
      const oldImageWidth = this.w / 2.5 || 0.4;
      const oldImageHeight = this.w || 1;
      this.ballImageLocalPosses = ballPosses.map((point) => ({
        x: Math.max(0, Math.min(1, (point.x - this.dx) / oldImageWidth)),
        y: Math.max(0, Math.min(1, (point.y - this.dy) / oldImageHeight)),
      }));
    }

    this.imageWhitemode = imageWhitemode;
    this.imageDarkmode = imageDarkmode;
  }

  updateTime() {
    const curTime = performance.now();
    let dt = curTime - this.lastTime;
    if (dt >= 1000) {
      dt = 0;
    }

    this.t += dt;
    if (this.t >= this.nextFinishAt) {
      this.nextFinishAt += this.total_time;
      this.finished_lvl();
      if (!this.active) {
        this.lastTime = curTime;
        return;
      }
    }
    this.updateBall();

    this.lastTime = curTime;
  }

  drawBall(i, imgX, imgY, imgSize) {
    const palette = getModeDotPalette(this.settings);
    const radius = this.fixedDotRadiusDivisor
      ? this.canvas.width / this.fixedDotRadiusDivisor
      : imgSize / this.dotRadiusDivisor;
    const toCanvasPoint = (point) => ({
      x: imgX + point.x * imgSize,
      y: imgY + point.y * imgSize,
    });

    if (this.show1Ball) {
      const point = this.ballImageLocalPosses[i];
      if (!point) {
        return;
      }
      const canvasPoint = toCanvasPoint(point);
      this._drawCircleWithShading(
        canvasPoint.x,
        canvasPoint.y,
        palette.primary,
        palette.secondary,
        palette.outline,
        radius
      );
      return;
    }

    for (let j = 0; j < this.ballImageLocalPosses.length; j += 1) {
      if (j !== i) {
        const canvasPoint = toCanvasPoint(this.ballImageLocalPosses[j]);
        this._drawCircleWithShading(
          canvasPoint.x,
          canvasPoint.y,
          palette.primary,
          palette.secondary,
          palette.outline,
          radius
        );
      }
    }
  }

  updateUI() {
    super.updateUI();

    const width = this.canvas.width;
    const height = this.canvas.height;

    const image = this.settings.darkmode ? this.imageDarkmode : this.imageWhitemode;
    const size = Math.min((this.w * width) / 2.5, height * 0.82);
    const imgX = (width - size) / 2;
    const imgY = (height - size) / 2;
    this.ctx.drawImage(image, imgX, imgY, size, size);
    this.drawBall(this.currentBallIndex, imgX, imgY, size);
  }

  updateBall() {
    while (this.t >= this.currentThousand) {
      this.currentBallIndex += 1;
      if (this.currentBallIndex >= this.ballPosses.length) {
        this.currentBallIndex = 0;
      }
      this.currentThousand += this.step;
    }
  }

  start_lvl() {
    this.t = 0;
    this.nextFinishAt = this.total_time + this.step;
    this.currentThousand = this.step;
    this.currentBallIndex = 0;
    this.lastTime = performance.now();
    super.start_lvl();
  }
}

class PVisionSunWorker extends CanvasBP {
  constructor(levelName, canvas, ctx, startPoint, settings, onFinished) {
    super(levelName, canvas, ctx, onFinished, settings);

    this.lastTime = null;
    this.start_point = startPoint;
    this.distance = 0.2;
    this.speed = 140;
    this.center_point = Math.max(this.start_point - this.distance, 0.5 + 1 / 36);
    this.current_point = this.center_point;
    this.expanding = true;
  }

  getDt() {
    const curTime = performance.now();
    if (this.lastTime == null) {
      this.lastTime = curTime;
      return 0;
    }
    const dt = Math.max(0, Math.min(50, curTime - this.lastTime));
    this.lastTime = curTime;
    return dt;
  }

  drawPeripheralDot(centerX, centerY, radius) {
    const palette = getModeDotPalette(this.settings);
    this._drawCircleWithShading(
      centerX,
      centerY,
      palette.primary,
      palette.secondary,
      palette.outline,
      radius
    );
  }

  updateUI() {
    super.updateUI();

    const width = this.canvas.width;
    const height = this.canvas.height;
    const y = height / 2;
    const radius = width / 36;
    const leftX = (1 - this.current_point) * width;
    const rightX = this.current_point * width;

    this.drawPeripheralDot(leftX, y, radius);
    this.drawPeripheralDot(rightX, y, radius);
  }

  updatePos() {
    const dt = this.getDt();
    const dx = (dt * this.speed) / 2000000;
    this.center_point = Math.max(this.start_point - this.distance, 0.5 + 1 / 36);

    if (this.expanding) {
      this.current_point += dx;
      if (this.current_point >= this.start_point) {
        this.current_point = this.start_point;
        this.expanding = false;
      }
      return;
    }

    this.current_point -= dx;
    if (this.current_point <= this.center_point) {
      this.current_point = this.center_point;
      this.expanding = true;
      this.finished_lvl();
    }
  }

  animate() {
    this.updatePos();
    super.animate();
  }

  start_lvl() {
    this.center_point = Math.max(this.start_point - this.distance, 0.5 + 1 / 36);
    this.current_point = this.center_point;
    this.expanding = true;
    this.lastTime = performance.now();
    super.start_lvl();
  }
}

class Trainer {
  constructor(levelName, canvas, ctx, maxLoops, onTrainerFinished) {
    this.level_name = levelName;
    this.canvas = canvas;
    this.ctx = ctx;
    this.maxLoops = maxLoops;
    this.curLoop = 0;
    this.isRunning = false;
    this.train = null;
    this.onTrainerFinished = onTrainerFinished;

    this.handleLoop = () => {
      this.curLoop += 1;
      if (this.curLoop >= this.maxLoops) {
        this.stop();
        if (typeof this.onTrainerFinished === "function") {
          this.onTrainerFinished();
        }
      }
    };
  }

  stopAnimation() {
    if (typeof this.train?.stop_lvl === "function") {
      this.train.stop_lvl();
      return;
    }
    if (this.train?.animationId) {
      cancelAnimationFrame(this.train.animationId);
    }
  }

  start() {
    if (!this.train) {
      return;
    }
    this.isRunning = true;
    this.curLoop = 0;
    this.train.start_lvl();
  }

  stop() {
    this.isRunning = false;
    this.stopAnimation();
  }
}

class ZigZaag extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const coordinatesArray = [];
    const cols = 7;
    const startX = 0.16;
    const endX = 0.84;
    for (let i = 0; i < cols; i += 1) {
      const ratio = cols === 1 ? 0 : i / (cols - 1);
      const x = startX + (endX - startX) * ratio;
      coordinatesArray.push({ x, y: 0.1 });
      coordinatesArray.push({ x, y: 0.9 });
    }

    const speed = 2125;
    this.train = new LinearCircle("ZigZaag", canvas, ctx, coordinatesArray, speed, true, settings, this.handleLoop);
  }

  start() {
    applyBallPalette(this.train.settings, getModeDotPalette(this.train.settings));
    super.start();
  }
}

class Star extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const centerX = 0.5;
    const centerY = 0.5;
    const radius = 0.45;
    const outer = [];
    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / 5;
      outer.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }
    const drawOrder = [1, 3, 0, 2, 4, 1];
    const coordinatesArray = drawOrder.map((index) => outer[index]);

    const speed = 5700;
    let starPath = null;
    const finishAtStart = () => {
      // Ensure the final rendered frame is back at the start point before switching.
      if (starPath) {
        starPath.t = 0;
        starPath.updateUI();
      }
      this.handleLoop();
    };

    starPath = new AspectLockedLinearCircle(
      "Star",
      canvas,
      ctx,
      coordinatesArray,
      speed,
      false,
      settings,
      finishAtStart
    );
    this.train = starPath;
  }

  start() {
    applyBallPalette(this.train.settings, getModeDotPalette(this.train.settings));
    super.start();
  }
}

class InfinityBall extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const fx = (t) => Math.cos(t) / (1 + Math.pow(Math.sin(t), 2));
    const fy = (t) => (Math.sin(t) * Math.cos(t)) / (1 + Math.pow(Math.sin(t), 2));

    const speed = 11000;
    this.train = new ParametricCircle(
      "Infinity",
      canvas,
      ctx,
      speed,
      false,
      fx,
      fy,
      fx,
      fy,
      settings,
      this.handleLoop
    );
  }

  start() {
    applyBallPalette(this.train.settings, getModeDotPalette(this.train.settings));
    super.start();
  }
}

class CircleBall extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const fx = (t) => 0.5 * Math.cos((t * 8) / 9 - (3.5 * Math.PI) / 9);
    const fy = (t) => 0.5 * Math.sin((t * 8) / 9 - (3.5 * Math.PI) / 9);
    const fxDraw = (t) => 0.5 * Math.cos(t);
    const fyDraw = (t) => 0.5 * Math.sin(t);

    const speed = 15000;
    this.train = new ParametricCircle(
      "Circle",
      canvas,
      ctx,
      speed,
      true,
      fx,
      fy,
      fxDraw,
      fyDraw,
      settings,
      this.handleLoop
    );
  }

  start() {
    applyBallPalette(this.train.settings, getModeDotPalette(this.train.settings));
    super.start();
  }
}

class ZigZaag2 extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const coordinatesArray = [];
    const rows = 6;
    const startY = 0.12;
    const endY = 0.88;
    const leftX = 0.18;
    const rightX = 0.82;
    for (let i = 0; i < rows; i += 1) {
      const ratio = rows === 1 ? 0 : i / (rows - 1);
      const y = startY + (endY - startY) * ratio;
      // Keep each row horizontal, and connect rows with diagonal segments (like vertical-wave logic).
      coordinatesArray.push({ y, x: leftX });
      coordinatesArray.push({ y, x: rightX });
    }

    const speed = 2600;
    this.train = new LinearCircle("ZigZaag2", canvas, ctx, coordinatesArray, speed, true, settings, this.handleLoop);
  }

  start() {
    applyBallPalette(this.train.settings, getModeDotPalette(this.train.settings));
    super.start();
  }
}

class FlickBall extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const ballPositions = [
      { x: 0.2, y: 0.1 },
      { x: 0.4, y: 0.1 },
      { x: 0.19, y: 0.3 },
      { x: 0.19, y: 0.9 },
      { x: 0.38, y: 0.45 },
      { x: 0.35, y: 0.9 },
      { x: 0.8, y: 0.9 },
      { x: 0.75, y: 0.1 },
      { x: 0.65, y: 0.6 },
      { x: 0.5, y: 0.7 },
      { x: 0.57, y: 0.1 },
    ];

    this.train = new FlickWorker("flick", canvas, ctx, ballPositions, 750, true, settings, this.handleLoop);
  }
}

class MultipleCircles extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const lSide = 0.15;
    const rSide = 0.85;
    const ballPositions = [
      { x: rSide, y: 0.1 },
      { x: lSide, y: 0.225 },
      { x: rSide, y: 0.35 },
      { x: lSide, y: 0.475 },
      { x: rSide, y: 0.6 },
      { x: lSide, y: 0.725 },
      { x: rSide, y: 0.85 },
    ];

    this.train = new MultipleCirclesWorker(
      "mBalls1",
      canvas,
      ctx,
      ballPositions,
      true,
      1000,
      lSide,
      rSide,
      settings,
      this.handleLoop
    );
  }
}

class MultipleCircles2 extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const lSide = 0.08;
    const rSide = 0.92;
    const ballPositions = [];

    for (let i = 1; i < 9; i += 1) {
      ballPositions.push({ y: lSide, x: i / 9 });
      ballPositions.push({ y: rSide, x: (1 + 2 * i) / 18 });
    }

    this.train = new MultipleCirclesWorker(
      "mBalls2",
      canvas,
      ctx,
      ballPositions,
      false,
      1200,
      lSide,
      rSide,
      settings,
      this.handleLoop
    );
  }
}

class MultipleCirclesFast extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const lSide = 0.15;
    const rSide = 0.85;
    const ballPositions = [
      { x: rSide, y: 0.1 },
      { x: lSide, y: 0.225 },
      { x: rSide, y: 0.35 },
      { x: lSide, y: 0.475 },
      { x: rSide, y: 0.6 },
      { x: lSide, y: 0.725 },
      { x: rSide, y: 0.85 },
    ];

    this.train = new MultipleCirclesWorker(
      "mBalls1Fast",
      canvas,
      ctx,
      ballPositions,
      true,
      2100,
      lSide,
      rSide,
      settings,
      this.handleLoop
    );
  }
}

class MultipleCircles2Fast extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const lSide = 0.08;
    const rSide = 0.92;
    const ballPositions = [];

    for (let i = 1; i < 9; i += 1) {
      ballPositions.push({ y: lSide, x: i / 9 });
      ballPositions.push({ y: rSide, x: (1 + 2 * i) / 18 });
    }

    this.train = new MultipleCirclesWorker(
      "mBalls2Fast",
      canvas,
      ctx,
      ballPositions,
      false,
      2700,
      lSide,
      rSide,
      settings,
      this.handleLoop
    );
  }
}

class FreeBall extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);
    this.train = new FreeBallWorker("freeBaller", canvas, ctx, settings, this.handleLoop);
  }
}

class PvisionSun extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);
    this.train = new PVisionSunWorker("pvis_sun", canvas, ctx, 0.7, settings, this.handleLoop);
  }
}

class RandomBallTrainer extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);
    this.train = new RandomBall("ranBall", canvas, ctx, settings, this.handleLoop);
  }
}

class ZoomEWorker extends CanvasBP {
  constructor(levelName, canvas, ctx, settings, onFinished) {
    super(levelName, canvas, ctx, onFinished, settings);
    this.cycleDuration = 4400;
    this.minScale = 0.2;
    this.maxScale = 2.3;
    this.elapsed = 0;
    this.lastTime = null;
    this.completedCycles = 0;
    this.orientations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    this.orientationIndex = 0;
    this.rotationDirection = 1;
    this.stepsInCurrentDirection = 0;
    this.tunnelRingCount = 22;
    this.tunnelSpeed = 0.00018;
    this.tunnelRailAnchorScale = 0.08;
  }

  updateTime() {
    const now = performance.now();
    if (this.lastTime == null) {
      this.lastTime = now;
      return;
    }

    const dt = Math.max(0, Math.min(50, now - this.lastTime));
    this.lastTime = now;
    this.elapsed += dt;

    const currentCycles = Math.floor(this.elapsed / this.cycleDuration);
    if (currentCycles > this.completedCycles) {
      this.completedCycles = currentCycles;
      this.orientationIndex =
        (this.orientationIndex + this.rotationDirection + this.orientations.length) %
        this.orientations.length;
      this.stepsInCurrentDirection += 1;
      if (this.stepsInCurrentDirection >= this.orientations.length) {
        this.rotationDirection *= -1;
        this.stepsInCurrentDirection = 0;
      }
      this.finished_lvl();
    }
  }

  updateUI() {
    super.updateUI();

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.drawEndlessTunnel(width, height);

    const progress = (this.elapsed % this.cycleDuration) / this.cycleDuration;
    const pulse = 0.5 - 0.5 * Math.cos(progress * Math.PI * 2);
    const scale = this.minScale + (this.maxScale - this.minScale) * pulse;

    const baseSize = Math.min(width, height) * 0.22;
    const fontSize = Math.max(36, Math.round(baseSize * scale));

    this.ctx.save();
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = this.settings.darkmode ? "#f2f5ff" : "#111827";
    this.ctx.font = `800 ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;
    if (this.settings.darkmode) {
      this.ctx.shadowColor = "rgba(242,245,255,0.14)";
      this.ctx.shadowBlur = 18;
    }
    this.ctx.translate(width / 2, height / 2);
    this.ctx.rotate(this.orientations[this.orientationIndex]);
    this.ctx.fillText("E", 0, 0);
    this.ctx.restore();
  }

  drawEndlessTunnel(width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const time = this.elapsed * this.tunnelSpeed;
    const lineColor = this.settings.darkmode ? "176,206,255" : "92,110,145";
    const sideGlowColor = this.settings.darkmode ? "34,66,128" : "158,176,210";

    this.ctx.save();
    this.ctx.translate(cx, cy);

    const sideGlow = this.ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
    if (this.settings.darkmode) {
      sideGlow.addColorStop(0, `rgba(${sideGlowColor},0.28)`);
      sideGlow.addColorStop(0.22, `rgba(${sideGlowColor},0.08)`);
      sideGlow.addColorStop(0.5, `rgba(${sideGlowColor},0)`);
      sideGlow.addColorStop(0.78, `rgba(${sideGlowColor},0.08)`);
      sideGlow.addColorStop(1, `rgba(${sideGlowColor},0.28)`);
    } else {
      sideGlow.addColorStop(0, `rgba(${sideGlowColor},0.2)`);
      sideGlow.addColorStop(0.22, `rgba(${sideGlowColor},0.06)`);
      sideGlow.addColorStop(0.5, `rgba(${sideGlowColor},0)`);
      sideGlow.addColorStop(0.78, `rgba(${sideGlowColor},0.06)`);
      sideGlow.addColorStop(1, `rgba(${sideGlowColor},0.2)`);
    }
    this.ctx.fillStyle = sideGlow;
    this.ctx.fillRect(-width / 2, -height / 2, width, height);

    for (let i = 0; i < this.tunnelRingCount; i += 1) {
      const phase = (i / this.tunnelRingCount + time) % 1;
      const depth = 1 - phase;
      const easedDepth = depth * depth;
      const tunnelScale = 0.08 + easedDepth * 1.45;
      const ringWidth = width * tunnelScale;
      const ringHeight = height * tunnelScale;
      const alphaBase = this.settings.darkmode ? 0.34 : 0.24;
      const alphaValue = 0.08 + easedDepth * alphaBase;
      const alpha = alphaValue.toFixed(3);

      this.ctx.strokeStyle = `rgba(${lineColor},${alpha})`;
      this.ctx.lineWidth = 1.4 + easedDepth * 3.2;
      this.ctx.strokeRect(-ringWidth / 2, -ringHeight / 2, ringWidth, ringHeight);
    }

    const targetWidth = width * this.tunnelRailAnchorScale;
    const targetHeight = height * this.tunnelRailAnchorScale;

    this.ctx.strokeStyle = `rgba(${lineColor},${this.settings.darkmode ? 0.2 : 0.14})`;
    this.ctx.lineWidth = this.settings.darkmode ? 1.8 : 1.5;
    this.ctx.strokeRect(-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

    // Add static tunnel side rails that always connect to the same inner-frame corners.
    const railAlpha = this.settings.darkmode ? 0.26 : 0.18;
    this.ctx.strokeStyle = `rgba(${lineColor},${railAlpha})`;
    this.ctx.lineWidth = this.settings.darkmode ? 2.2 : 1.8;
    const outerX = width * 0.5;
    const outerY = height * 0.5;
    const innerX = targetWidth * 0.5;
    const innerY = targetHeight * 0.5;
    const rails = [
      [-outerX, -outerY, -innerX, -innerY],
      [outerX, -outerY, innerX, -innerY],
      [-outerX, outerY, -innerX, innerY],
      [outerX, outerY, innerX, innerY],
    ];
    rails.forEach(([x1, y1, x2, y2]) => {
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  start_lvl() {
    this.elapsed = 0;
    this.completedCycles = 0;
    this.orientationIndex = 0;
    this.rotationDirection = 1;
    this.stepsInCurrentDirection = 0;
    this.lastTime = performance.now();
    super.start_lvl();
  }
}

class ZoomETrainer extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);
    this.train = new ZoomEWorker("zoomE", canvas, ctx, settings, this.handleLoop);
  }
}

class Pvision1 extends Trainer {
  constructor(levelName, canvas, ctx, maxLoops, settings, onTrainerFinished) {
    super(levelName, canvas, ctx, maxLoops, onTrainerFinished);

    const ballPosses = [
      { x: 0.5, y: -0.08 },
      { x: 0.79, y: -0.002 },
      { x: 1.002, y: 0.21 },
      { x: 1.08, y: 0.5 },
      { x: 1.002, y: 0.79 },
      { x: 0.79, y: 1.002 },
      { x: 0.5, y: 1.08 },
      { x: 0.21, y: 1.002 },
      { x: -0.002, y: 0.79 },
      { x: -0.08, y: 0.5 },
      { x: -0.002, y: 0.21 },
      { x: 0.21, y: -0.002 },
    ];

    const imageWhitemode = new Image();
    imageWhitemode.src = resolveAssetPath("pvision2whitemode.svg");

    const imageDarkmode = new Image();
    imageDarkmode.src = resolveAssetPath("pvision2darkmode.svg");

    this.train = new PVisionWorker(
      "pvis1",
      canvas,
      ctx,
      ballPosses,
      imageWhitemode,
      imageDarkmode,
      true,
      850,
      0,
      0,
      0.9,
      settings,
      this.handleLoop,
      true,
      60,
      70
    );
  }
}

export class EyeTrainerController {
  constructor(canvas, options = {}) {
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true }) || canvas.getContext("2d");
    this.canvas = canvas;
    this.ctx = ctx;
    this.settings = new Settings();

    this.onExerciseNameChange = options.onExerciseNameChange;
    this.onBackgroundModeChange = options.onBackgroundModeChange;
    this.destroyed = false;

    this.currentTrainerIndex = 0;
    this.trainingMode = "single";
    this.comprehensiveOrder = [];
    this.comprehensiveCursor = -1;
    this.singleOrder = [];
    this.singleCursor = -1;

    const handleTrainerComplete = () => {
      if (this.destroyed) {
        return;
      }
      if (this.trainingMode === "comprehensive") {
        this.startNextComprehensiveTrainer();
        return;
      }
      this.restartCurrentTrainer();
    };

    const trainerDefinitions = [
      {
        id: "verticalWaves",
        comprehensiveLoops: 1,
        create: () =>
          new ZigZaag("Vertical Waves", canvas, ctx, 1, this.settings, handleTrainerComplete),
      },
      {
        id: "stellarTrail",
        comprehensiveLoops: 6,
        create: () =>
          new Star("Stellar Trail", canvas, ctx, 4, this.settings, handleTrainerComplete),
      },
      {
        id: "infinityTrail",
        comprehensiveLoops: 16,
        create: () =>
          new InfinityBall("Infinity Trail", canvas, ctx, 4, this.settings, handleTrainerComplete),
      },
      {
        id: "circularTrail",
        comprehensiveLoops: 6,
        create: () =>
          new CircleBall("Circular Trail", canvas, ctx, 3, this.settings, handleTrainerComplete),
      },
      {
        id: "horizontalWave",
        comprehensiveLoops: 1,
        create: () =>
          new ZigZaag2("Horizontal Wave", canvas, ctx, 1, this.settings, handleTrainerComplete),
      },
      {
        id: "flickPulse",
        comprehensiveLoops: 1,
        create: () =>
          new FlickBall("Flick Pulse", canvas, ctx, 3, this.settings, handleTrainerComplete),
      },
      {
        id: "horizontalBalls",
        comprehensiveLoops: 1,
        create: () =>
          new MultipleCircles(
            "Horizontal Balls",
            canvas,
            ctx,
            2,
            this.settings,
            handleTrainerComplete
          ),
      },
      {
        id: "verticalBalls",
        comprehensiveLoops: 1,
        create: () =>
          new MultipleCircles2(
            "Vertical Balls",
            canvas,
            ctx,
            2,
            this.settings,
            handleTrainerComplete
          ),
      },
      {
        id: "horizontalFast",
        comprehensiveLoops: 1,
        create: () =>
          new MultipleCirclesFast(
            "Horizontal Fast",
            canvas,
            ctx,
            2,
            this.settings,
            handleTrainerComplete
          ),
      },
      {
        id: "verticalFast",
        comprehensiveLoops: 1,
        create: () =>
          new MultipleCircles2Fast(
            "Vertical Fast",
            canvas,
            ctx,
            2,
            this.settings,
            handleTrainerComplete
          ),
      },
      {
        id: "freeBall",
        comprehensiveLoops: 1,
        create: () =>
          new FreeBall("Free Ball", canvas, ctx, 1, this.settings, handleTrainerComplete),
      },
      {
        id: "peripheral1",
        comprehensiveLoops: 5,
        create: () =>
          new PvisionSun("Peripheral 1", canvas, ctx, 5, this.settings, handleTrainerComplete),
      },
      {
        id: "zoomE",
        // 68 * 4.4s is approximately five minutes in comprehensive mode.
        comprehensiveLoops: 68,
        create: () =>
          new ZoomETrainer("Zoom E", canvas, ctx, 1, this.settings, handleTrainerComplete),
      },
      {
        id: "peripheral2",
        comprehensiveLoops: 4,
        create: () =>
          new Pvision1("Peripheral 2", canvas, ctx, 1, this.settings, handleTrainerComplete),
      },
    ];

    this.trainers = trainerDefinitions.map((definition) => {
      const trainer = definition.create();
      trainer.id = definition.id;
      trainer.comprehensiveLoops = definition.comprehensiveLoops;
      return trainer;
    });
    this.trainerIndexById = new Map(
      this.trainers.map((trainer, index) => [trainer.id, index])
    );
    this.comprehensiveOrder = this.trainers.map((_, index) => index);
    const zoomEIndex = this.trainerIndexById.get("zoomE");
    if (typeof zoomEIndex === "number") {
      this.comprehensiveOrder = [
        zoomEIndex,
        ...this.comprehensiveOrder.filter((index) => index !== zoomEIndex),
      ];
    }
    this.singleOrder = [...this.comprehensiveOrder];
    this.singleCursor = this.singleOrder.indexOf(this.currentTrainerIndex);
    if (this.singleCursor < 0) {
      this.singleCursor = 0;
    }
    this.applyModeLoops();
  }

  applyModeLoops() {
    const isComprehensive = this.trainingMode === "comprehensive";
    for (let i = 0; i < this.trainers.length; i += 1) {
      this.trainers[i].maxLoops = isComprehensive
        ? (this.trainers[i].comprehensiveLoops ?? 1)
        : Number.MAX_SAFE_INTEGER;
    }
  }

  setTrainingMode(mode) {
    this.trainingMode = mode === "comprehensive" ? "comprehensive" : "single";
    this.applyModeLoops();
  }

  setShowGrid(value) {
    this.settings.showGrid = value;
  }

  setDarkMode(value) {
    this.settings.setDarkmode(value);
  }

  setDotPalette(palette) {
    this.settings.setDotPalette(palette);
  }

  getCurrentTrainerName() {
    return this.trainers[this.currentTrainerIndex]?.level_name ?? "";
  }

  start() {
    this.startSingleTrainer(this.currentTrainerIndex);
  }

  resolveTrainerIndex(trainerIdOrIndex) {
    if (typeof trainerIdOrIndex === "string") {
      return this.trainerIndexById.get(trainerIdOrIndex) ?? -1;
    }
    if (
      typeof trainerIdOrIndex === "number" &&
      Number.isInteger(trainerIdOrIndex) &&
      trainerIdOrIndex >= 0 &&
      trainerIdOrIndex < this.trainers.length
    ) {
      return trainerIdOrIndex;
    }
    return -1;
  }

  getTrainerIds() {
    return this.trainers.map((trainer) => trainer.id);
  }

  startSingleTrainer(trainerIdOrIndex) {
    const index = this.resolveTrainerIndex(trainerIdOrIndex);
    if (index < 0) {
      return;
    }
    this.setTrainingMode("single");
    this.stopCurrentIfRunning();
    this.comprehensiveCursor = -1;
    const cursor = this.singleOrder.indexOf(index);
    this.singleCursor = cursor >= 0 ? cursor : 0;
    this.startTrainer(index);
  }

  startComprehensive() {
    this.setTrainingMode("comprehensive");
    this.stopCurrentIfRunning();
    this.comprehensiveCursor = -1;
    this.startNextComprehensiveTrainer();
  }

  startNextComprehensiveTrainer() {
    if (!this.comprehensiveOrder.length) {
      return;
    }
    this.comprehensiveCursor += 1;
    if (this.comprehensiveCursor >= this.comprehensiveOrder.length) {
      this.comprehensiveCursor = 0;
    }
    this.startTrainer(this.comprehensiveOrder[this.comprehensiveCursor]);
  }

  startTrainer(index) {
    if (typeof index !== "number" || Number.isNaN(index)) {
      return;
    }
    if (index < 0 || index >= this.trainers.length) {
      return;
    }
    this.currentTrainerIndex = index;
    if (this.trainingMode !== "comprehensive") {
      const cursor = this.singleOrder.indexOf(index);
      if (cursor >= 0) {
        this.singleCursor = cursor;
      }
    }

    const trainer = this.trainers[index];
    if (!trainer) {
      return;
    }

    trainer.start();
    this.onExerciseNameChange?.(trainer.level_name);
  }

  stopCurrentIfRunning() {
    const trainer = this.trainers[this.currentTrainerIndex];
    if (trainer?.isRunning) {
      trainer.stop();
    }
  }

  restartCurrentTrainer() {
    if (this.destroyed) {
      return;
    }
    this.startTrainer(this.currentTrainerIndex);
  }

  nextTrainer() {
    if (this.destroyed) {
      return;
    }

    this.stopCurrentIfRunning();

    if (this.trainingMode === "comprehensive") {
      this.startNextComprehensiveTrainer();
      return;
    }

    if (!this.singleOrder.length) {
      return;
    }
    if (this.singleCursor < 0) {
      const cursor = this.singleOrder.indexOf(this.currentTrainerIndex);
      this.singleCursor = cursor >= 0 ? cursor : 0;
    }
    this.singleCursor += 1;
    if (this.singleCursor >= this.singleOrder.length) {
      this.singleCursor = 0;
    }
    this.startTrainer(this.singleOrder[this.singleCursor]);
  }

  prevTrainer() {
    if (this.destroyed) {
      return;
    }

    this.stopCurrentIfRunning();

    if (this.trainingMode === "comprehensive") {
      if (!this.comprehensiveOrder.length) {
        return;
      }
      this.comprehensiveCursor -= 1;
      if (this.comprehensiveCursor < 0) {
        this.comprehensiveCursor = this.comprehensiveOrder.length - 1;
      }
      this.startTrainer(this.comprehensiveOrder[this.comprehensiveCursor]);
      return;
    }

    if (!this.singleOrder.length) {
      return;
    }
    if (this.singleCursor < 0) {
      const cursor = this.singleOrder.indexOf(this.currentTrainerIndex);
      this.singleCursor = cursor >= 0 ? cursor : 0;
    }
    this.singleCursor -= 1;
    if (this.singleCursor < 0) {
      this.singleCursor = this.singleOrder.length - 1;
    }
    this.startTrainer(this.singleOrder[this.singleCursor]);
  }

  destroy() {
    this.destroyed = true;

    for (let i = 0; i < this.trainers.length; i += 1) {
      this.trainers[i].stop();
    }

    this.onBackgroundModeChange?.(null);
  }
}
