const state = {
  before: [],
  after: [],
  rendered: "front",
};

const views = [
  { id: "front", label: "front", title: "第 1 组 / 正面", index: 0 },
  { id: "side", label: "side-1", title: "第 2 组 / 侧面", index: 1 },
  { id: "side2", label: "side-2", title: "第 3 组 / 侧面", index: 2 },
];

const sampleImages = {
  before: [
    { name: "IMG_1996 before front", src: "assets/before-front.jpg" },
    { name: "IMG_1997 before side", src: "assets/before-side.jpg" },
  ],
  after: [
    { name: "IMG_2004 after front", src: "assets/after-front.jpg" },
    { name: "IMG_2006 after side", src: "assets/after-side.jpg" },
  ],
};

const layoutText = {
  title: "M22 IPL",
  before: "Before",
  after: "After-Same Day",
};

const logoImage = new Image();
let logoReady = false;
logoImage.onload = () => {
  logoReady = true;
  renderAllComparisons();
};
logoImage.src = "logo-cropped.png";

const settings = Object.fromEntries(
  views.map((view) => [
    view.id,
    {
      tab: "crop",
      privacyBar: true,
      transform: {
        before: { zoom: 1, offsetX: 0, offsetY: -0.02, rotation: 0 },
        after: { zoom: 1.03, offsetX: 0, offsetY: -0.01, rotation: 0 },
      },
      adjustment: {
        before: { brightness: 1.06, contrast: 1.02, saturation: 1.02, warmth: 4 },
        after: { brightness: 1.05, contrast: 1.02, saturation: 1.02, warmth: 3 },
      },
      redaction: {
        before: { height: 280, y: 485 },
        after: { height: 280, y: 485 },
      },
    },
  ]),
);

const root = document.querySelector("#comparisonSections");
root.innerHTML = views.map(renderSectionShell).join("");
initializeCanvasGestures();

document.querySelector("#beforeInput").addEventListener("change", (event) => {
  readFiles(event.target.files, "before");
});

document.querySelector("#afterInput").addEventListener("change", (event) => {
  readFiles(event.target.files, "after");
});

document.querySelector("#downloadAllJpg").addEventListener("click", () => {
  downloadAllComparisons();
});

document.querySelectorAll("[data-text]").forEach((input) => {
  input.addEventListener("input", () => {
    layoutText[input.dataset.text] = input.value;
    renderAllComparisons();
  });
});

root.addEventListener("input", (event) => {
  const input = event.target;
  const viewId = input.dataset.view;
  if (!viewId) return;

  if (input.dataset.text) {
    layoutText[input.dataset.text] = input.value;
    renderAllComparisons();
    return;
  }

  const role = input.dataset.role;
  const field = input.dataset.field;
  if (input.dataset.group === "transform") settings[viewId].transform[role][field] = Number(input.value);
  if (input.dataset.group === "adjustment") settings[viewId].adjustment[role][field] = Number(input.value);
  if (input.dataset.group === "redaction") settings[viewId].redaction[role][field] = Number(input.value);
  renderComparison(viewId);
});

root.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("select")) renderComparison(target.dataset.view);
  if (target.dataset.privacy) {
    settings[target.dataset.view].privacyBar = target.checked;
    renderComparison(target.dataset.view);
  }
});

root.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const viewId = button.dataset.view;
  if (button.dataset.tab) {
    settings[viewId].tab = button.dataset.tab;
    updateToolPanels(viewId);
    return;
  }
  if (button.dataset.rotate) {
    rotateSelectedImage(button.dataset.role, viewId, Number(button.dataset.rotate));
    return;
  }
  if (button.dataset.download) {
    renderComparison(viewId);
    downloadCanvas(getCanvas(viewId), `m22-ipl-${viewId}.jpg`, "image/jpeg", 0.94);
  }
});

function renderSectionShell(view) {
  return `
    <section class="compare-section" data-section="${view.id}">
      <div class="section-stage">
        <div class="section-head">
          <h2>${view.title}</h2>
          <button type="button" data-download="jpg" data-view="${view.id}">下载本组 JPG</button>
        </div>
        <div class="stage-pair-controls">
          <div>
            <label>Before <select data-role="before" data-view="${view.id}"></select></label>
            <div class="mini-rotate">
              <button type="button" data-role="before" data-view="${view.id}" data-rotate="-90">左转</button>
              <button type="button" data-role="before" data-view="${view.id}" data-rotate="90">右转</button>
            </div>
          </div>
          <div>
            <label>After <select data-role="after" data-view="${view.id}"></select></label>
            <div class="mini-rotate">
              <button type="button" data-role="after" data-view="${view.id}" data-rotate="-90">左转</button>
              <button type="button" data-role="after" data-view="${view.id}" data-rotate="90">右转</button>
            </div>
          </div>
        </div>
        <canvas id="output-${view.id}" width="2730" height="1536"></canvas>
      </div>

      <aside class="section-tools">
        <div class="tool-tabs">
          <button class="tab-button is-active" type="button" data-tab="crop" data-view="${view.id}">裁剪</button>
          <button class="tab-button" type="button" data-tab="light" data-view="${view.id}">光线</button>
          <button class="tab-button" type="button" data-tab="redact" data-view="${view.id}">遮眼条</button>
        </div>

        <div class="tool-panel is-active" data-panel="crop" data-view="${view.id}">
          ${renderCropControls(view.id)}
        </div>
        <div class="tool-panel" data-panel="light" data-view="${view.id}">
          ${renderLightControls(view.id)}
        </div>
        <div class="tool-panel" data-panel="redact" data-view="${view.id}">
          ${renderRedactionControls(view.id)}
        </div>
      </aside>
    </section>
  `;
}

function renderCropControls(viewId) {
  return renderRoleColumns(viewId, "transform", [
    ["zoom", "缩放", 0.8, 1.8, 0.01],
    ["offsetX", "左右", -0.5, 0.5, 0.01],
    ["offsetY", "上下", -0.5, 0.5, 0.01],
    ["rotation", "旋转", -8, 8, 0.1],
  ]);
}

function renderLightControls(viewId) {
  return renderRoleColumns(viewId, "adjustment", [
    ["brightness", "亮度", 0.85, 1.2, 0.01],
    ["contrast", "对比", 0.9, 1.12, 0.01],
    ["saturation", "饱和", 0.9, 1.12, 0.01],
    ["warmth", "暖色", -10, 16, 1],
  ]);
}

function renderRedactionControls(viewId) {
  const enabled = settings[viewId].privacyBar ? "checked" : "";
  return `
    <label class="check"><input type="checkbox" data-privacy="true" data-view="${viewId}" ${enabled}> 显示黑色遮挡</label>
    ${renderRoleColumns(viewId, "redaction", [
      ["height", "高度", 110, 420, 5],
      ["y", "位置", 260, 760, 5],
    ])}
  `;
}

function renderRoleColumns(viewId, group, rows) {
  const labels = { before: "Before", after: "After" };
  return `
    <div class="transform-grid">
      ${["before", "after"]
        .map(
          (role) => `
            <div>
              <h3>${labels[role]}</h3>
              ${rows
                .map(([field, label, min, max, step]) => {
                  const value = settings[viewId][group][role][field];
                  return `<label>${label} <input data-group="${group}" data-role="${role}" data-field="${field}" data-view="${viewId}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
                })
                .join("")}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function updateToolPanels(viewId) {
  document.querySelectorAll(`[data-view="${viewId}"][data-tab]`).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === settings[viewId].tab);
  });
  document.querySelectorAll(`[data-view="${viewId}"][data-panel]`).forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === settings[viewId].tab);
  });
}

function initializeCanvasGestures() {
  views.forEach((view) => {
    const canvas = getCanvas(view.id);
    const gesture = {
      pointers: new Map(),
      role: "before",
      startTransform: null,
      startCenter: null,
      startDistance: 0,
      startAngle: 0,
    };

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      const isFirstPointer = gesture.pointers.size === 0;
      gesture.pointers.set(event.pointerId, getCanvasPoint(canvas, event));
      if (isFirstPointer) gesture.role = getRoleForPoint(canvas, event);
      startGesture(view.id, gesture);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!gesture.pointers.has(event.pointerId)) return;
      event.preventDefault();
      gesture.pointers.set(event.pointerId, getCanvasPoint(canvas, event));
      applyGesture(view.id, gesture);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
      canvas.addEventListener(name, (event) => {
        if (!gesture.pointers.has(event.pointerId)) return;
        gesture.pointers.delete(event.pointerId);
        if (gesture.pointers.size > 0) startGesture(view.id, gesture);
      });
    });
  });
}

function startGesture(viewId, gesture) {
  const points = [...gesture.pointers.values()];
  gesture.startTransform = { ...settings[viewId]?.transform?.[gesture.role] };
  if (!gesture.startTransform) return;
  gesture.startCenter = getPointCenter(points);
  gesture.startDistance = points.length > 1 ? getPointDistance(points[0], points[1]) : 0;
  gesture.startAngle = points.length > 1 ? getPointAngle(points[0], points[1]) : 0;
}

function applyGesture(viewId, gesture) {
  const points = [...gesture.pointers.values()];
  if (!points.length || !gesture.startTransform || !gesture.startCenter) return;

  const transform = settings[viewId].transform[gesture.role];
  const center = getPointCenter(points);
  const deltaX = center.x - gesture.startCenter.x;
  const deltaY = center.y - gesture.startCenter.y;
  transform.offsetX = clamp(gesture.startTransform.offsetX - deltaX / 900, -0.5, 0.5);
  transform.offsetY = clamp(gesture.startTransform.offsetY - deltaY / 900, -0.5, 0.5);

  if (points.length > 1 && gesture.startDistance > 0) {
    const distance = getPointDistance(points[0], points[1]);
    const angle = getPointAngle(points[0], points[1]);
    const scale = distance / gesture.startDistance;
    const angleDelta = ((angle - gesture.startAngle) * 180) / Math.PI;
    transform.zoom = clamp(gesture.startTransform.zoom * scale, 0.8, 1.8);
    transform.rotation = clamp(gesture.startTransform.rotation + angleDelta, -8, 8);
  }

  syncTransformInputs(viewId, gesture.role);
  renderComparison(viewId);
}

function syncTransformInputs(viewId, role) {
  Object.entries(settings[viewId].transform[role]).forEach(([field, value]) => {
    const input = document.querySelector(
      `input[data-group="transform"][data-role="${role}"][data-field="${field}"][data-view="${viewId}"]`,
    );
    if (input) input.value = String(value);
  });
}

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function getRoleForPoint(canvas, event) {
  const point = getCanvasPoint(canvas, event);
  return point.x < canvas.width / 2 ? "before" : "after";
}

function getPointCenter(points) {
  const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  return { x: total.x / points.length, y: total.y / points.length };
}

function getPointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getPointAngle(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

async function readFiles(files, bucket) {
  const fileList = [...files];
  const images = [];
  setUploadProgress(bucket, 0, fileList.length, "开始处理");

  for (let index = 0; index < fileList.length; index += 1) {
    setUploadProgress(bucket, index, fileList.length, `处理中 ${index + 1}/${fileList.length}`);
    images.push(await normalizeFileImage(fileList[index]));
    setUploadProgress(bucket, index + 1, fileList.length, `已完成 ${index + 1}/${fileList.length}`);
    await waitForFrame();
  }

  state[bucket] = images;
  refreshSelects();
  renderAllComparisons();
  setUploadProgress(bucket, fileList.length, fileList.length, "完成");
}

function setUploadProgress(bucket, completed, total, label) {
  const progress = document.querySelector(`[data-progress="${bucket}"]`);
  const text = document.querySelector(`[data-progress-text="${bucket}"]`);
  if (!progress || !text) return;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  progress.value = percent;
  text.value = total > 0 ? `${label} · ${percent}%` : "等待上传";
}

function refreshSelects() {
  views.forEach((view) => {
    fillSelect("before", view.id);
    fillSelect("after", view.id);
  });
}

function fillSelect(bucket, viewId) {
  const select = document.querySelector(`select[data-role="${bucket}"][data-view="${viewId}"]`);
  const selectedValue = select.value;
  select.innerHTML = "";
  state[bucket].forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = item.name;
    select.append(option);
  });

  const view = views.find((item) => item.id === viewId);
  if (state[bucket][Number(selectedValue)]) select.value = selectedValue;
  else if (state[bucket][view.index]) select.value = String(view.index);
}

function getSelected(bucket, viewId) {
  const select = document.querySelector(`select[data-role="${bucket}"][data-view="${viewId}"]`);
  return state[bucket][Number(select.value)];
}

function renderAllComparisons() {
  views.forEach((view) => renderComparison(view.id));
}

function renderComparison(viewId) {
  state.rendered = viewId;
  const canvas = getCanvas(viewId);
  const ctx = canvas.getContext("2d");
  const before = getSelected("before", viewId);
  const after = getSelected("after", viewId);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawTitle(ctx, canvas);

  const leftRect = { x: 64, y: 124, w: 1216, h: 1320 };
  const rightRect = { x: 1450, y: 124, w: 1216, h: 1320 };
  const viewSettings = settings[viewId];

  if (before) drawPhoto(ctx, before.img, leftRect, viewSettings.transform.before, viewSettings.adjustment.before);
  else drawEmptySlot(ctx, leftRect, "Upload before pics");

  if (after) drawPhoto(ctx, after.img, rightRect, viewSettings.transform.after, viewSettings.adjustment.after);
  else drawEmptySlot(ctx, rightRect, "Upload after pics");

  if (viewSettings.privacyBar) {
    if (before) drawPrivacyBar(ctx, leftRect, viewSettings.redaction.before);
    if (after) drawPrivacyBar(ctx, rightRect, viewSettings.redaction.after);
  }

  drawBottomLabels(ctx, leftRect, rightRect);
  ctx.restore();
}

function getCanvas(viewId) {
  return document.querySelector(`#output-${viewId}`);
}

function drawTitle(ctx, canvas) {
  ctx.fillStyle = "#050505";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "italic 900 64px Georgia, 'Times New Roman', serif";
  ctx.fillText(layoutText.title, canvas.width / 2, 42);
  drawLogo(ctx, canvas);
}

function drawLogo(ctx, canvas) {
  if (!logoReady) return;
  const size = 100;
  const x = canvas.width / 2 - size / 2;
  const y = 64;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(logoImage, x, y, size, size);
  ctx.restore();
}

function drawPhoto(ctx, img, rect, transform, adjustment) {
  const zoom = transform.zoom || 1;
  const offsetX = transform.offsetX || 0;
  const offsetY = transform.offsetY || 0;
  const rotation = ((transform.rotation || 0) * Math.PI) / 180;
  const sourceRatio = img.naturalWidth / img.naturalHeight;
  const destRatio = rect.w / rect.h;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (sourceRatio > destRatio) sw = img.naturalHeight * destRatio;
  else sh = img.naturalWidth / destRatio;

  sw = sw / zoom;
  sh = sh / zoom;

  const sx = clamp((img.naturalWidth - sw) / 2 + offsetX * (img.naturalWidth - sw), 0, img.naturalWidth - sw);
  const sy = clamp((img.naturalHeight - sh) / 2 + offsetY * (img.naturalHeight - sh), 0, img.naturalHeight - sh);
  const diagonalScale = rotation === 0 ? 1 : 1.08;
  const drawW = rect.w * diagonalScale;
  const drawH = rect.h * diagonalScale;
  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.filter = `brightness(${adjustment.brightness}) contrast(${adjustment.contrast}) saturate(${adjustment.saturation})`;
  ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.filter = "none";
  ctx.restore();

  applyWarmth(ctx, rect, adjustment.warmth || 0);
}

function applyWarmth(ctx, rect, warmth) {
  if (warmth === 0) return;
  const imageData = ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] + warmth, 0, 255);
    data[i + 2] = clamp(data[i + 2] - warmth * 0.45, 0, 255);
  }
  ctx.putImageData(imageData, rect.x, rect.y);
}

function drawPrivacyBar(ctx, rect, redaction) {
  ctx.fillStyle = "#030100";
  ctx.fillRect(rect.x - 12, redaction.y, rect.w + 24, redaction.height);
}

function drawBottomLabels(ctx, leftRect, rightRect) {
  ctx.fillStyle = "#050505";
  ctx.textBaseline = "alphabetic";
  ctx.font = "italic 900 58px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "right";
  ctx.fillText(layoutText.before, leftRect.x + leftRect.w - 6, 1526);
  ctx.fillText(layoutText.after, rightRect.x + rightRect.w - 6, 1526);
}

function drawEmptyMessage(ctx, canvas) {
  ctx.fillStyle = "#17130f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 44px Inter, sans-serif";
  ctx.fillText("请上传 before / after 照片，或载入当前样例", canvas.width / 2, canvas.height / 2);
}

function drawEmptySlot(ctx, rect, text) {
  ctx.save();
  ctx.fillStyle = "#f5f1ea";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "#ddd5ca";
  ctx.lineWidth = 6;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#766f68";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 42px Inter, sans-serif";
  ctx.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

function loadPresetImage(item) {
  return loadImage(item.src, item.name);
}

async function normalizeFileImage(file) {
  try {
    const buffer = await file.arrayBuffer();
    const orientation = getExifOrientation(buffer);
    const bitmap = await createBitmapFromBuffer(buffer, file.type);
    let canvas = drawWithOrientation(bitmap, orientation);
    if (canvas.width > canvas.height) canvas = rotateCanvas(canvas, 90);
    return loadImage(canvas.toDataURL("image/jpeg", 0.96), file.name);
  } catch (error) {
    return readFileAsDataUrl(file).then((src) => loadImage(src, file.name));
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function createBitmapFromBuffer(buffer, type) {
  const blob = new Blob([buffer], { type });
  if (!("createImageBitmap" in window)) {
    return loadImage(URL.createObjectURL(blob), "upload").then((item) => item.img);
  }
  return createImageBitmap(blob, { imageOrientation: "none" }).catch(() => createImageBitmap(blob));
}

function drawWithOrientation(source, orientation) {
  const swapsSize = [5, 6, 7, 8].includes(orientation);
  const canvas = document.createElement("canvas");
  canvas.width = swapsSize ? source.height : source.width;
  canvas.height = swapsSize ? source.width : source.height;
  const ctx = canvas.getContext("2d");

  switch (orientation) {
    case 2:
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.translate(canvas.width, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7:
      ctx.translate(canvas.width, canvas.height);
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.translate(0, canvas.height);
      ctx.rotate(-0.5 * Math.PI);
      break;
    default:
      break;
  }

  ctx.drawImage(source, 0, 0);
  return canvas;
}

function rotateCanvas(source, degrees) {
  const normalized = ((degrees % 360) + 360) % 360;
  const quarterTurn = normalized === 90 || normalized === 270;
  const canvas = document.createElement("canvas");
  canvas.width = quarterTurn ? source.height : source.width;
  canvas.height = quarterTurn ? source.width : source.height;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function getExifOrientation(buffer) {
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xffd8) return 1;
  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) {
      offset += 2;
      if (view.getUint32(offset, false) !== 0x45786966) return 1;
      offset += 6;
      const little = view.getUint16(offset, false) === 0x4949;
      const firstIfdOffset = view.getUint32(offset + 4, little);
      let ifdOffset = offset + firstIfdOffset;
      const tags = view.getUint16(ifdOffset, little);
      ifdOffset += 2;
      for (let i = 0; i < tags; i += 1) {
        const tagOffset = ifdOffset + i * 12;
        if (view.getUint16(tagOffset, little) === 0x0112) return view.getUint16(tagOffset + 8, little);
      }
      return 1;
    }
    if ((marker & 0xff00) !== 0xff00) break;
    offset += view.getUint16(offset, false);
  }
  return 1;
}

function loadImage(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        name,
        src,
        img,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = src;
  });
}

async function rotateSelectedImage(bucket, viewId, degrees) {
  const select = document.querySelector(`select[data-role="${bucket}"][data-view="${viewId}"]`);
  const index = Number(select.value);
  const item = state[bucket][index];
  if (!item) return;

  const source = document.createElement("canvas");
  source.width = item.img.naturalWidth;
  source.height = item.img.naturalHeight;
  source.getContext("2d").drawImage(item.img, 0, 0);
  const rotated = rotateCanvas(source, degrees);
  state[bucket][index] = await loadImage(rotated.toDataURL("image/jpeg", 0.96), item.name);
  renderComparison(viewId);
}

async function downloadAllComparisons() {
  for (const view of views) {
    const before = getSelected("before", view.id);
    const after = getSelected("after", view.id);
    if (!before && !after) continue;
    renderComparison(view.id);
    await waitForFrame();
    await downloadCanvas(getCanvas(view.id), `m22-ipl-${view.label}.jpg`, "image/jpeg", 0.94);
  }
}

async function downloadCanvas(canvas, filename, type, quality) {
  const blob = await canvasToBlob(canvas, type, quality);
  const file = new File([blob], filename, { type });

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  if (isMobileDevice()) {
    showSavePreview(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function showSavePreview(blob, filename) {
  const url = URL.createObjectURL(blob);
  const overlay = document.createElement("div");
  overlay.className = "save-modal";
  overlay.innerHTML = `
    <div class="save-modal-panel">
      <div class="save-modal-head">
        <strong>${filename}</strong>
        <button type="button">关闭</button>
      </div>
      <p>长按图片，选择保存到照片/相册。</p>
      <img src="${url}" alt="${filename}">
    </div>
  `;
  document.body.append(overlay);
  overlay.querySelector("button").addEventListener("click", () => {
    overlay.remove();
    URL.revokeObjectURL(url);
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        const dataUrl = canvas.toDataURL(type, quality);
        resolve(dataUrlToBlob(dataUrl));
      }
    }, type, quality);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg";
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mime });
}

function waitForFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

refreshSelects();
renderAllComparisons();
