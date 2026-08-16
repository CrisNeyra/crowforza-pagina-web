export type ToastType = "success" | "error" | "info";

export function showToast(message: string, type: ToastType = "info"): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons: Record<ToastType, string> = {
    success: "fa-check",
    error: "fa-xmark",
    info: "fa-info",
  };
  const iconClass = icons[type] || icons.info;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const iconWrap = document.createElement("div");
  iconWrap.className = "toast__icon";
  const icon = document.createElement("i");
  icon.className = `fa-solid ${iconClass}`;
  iconWrap.appendChild(icon);

  const text = document.createElement("span");
  text.className = "toast__message";
  text.textContent = message;

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast__close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Cerrar notificación");
  const closeIcon = document.createElement("i");
  closeIcon.className = "fa-solid fa-xmark";
  closeBtn.appendChild(closeIcon);

  toast.append(iconWrap, text, closeBtn);
  container.appendChild(toast);

  closeBtn.addEventListener("click", () => removeToast(toast));
  setTimeout(() => removeToast(toast), 4000);
}

export function removeToast(toast: HTMLElement): void {
  toast.style.opacity = "0";
  toast.style.transform = "translateY(20px)";
  setTimeout(() => toast.remove(), 300);
}
