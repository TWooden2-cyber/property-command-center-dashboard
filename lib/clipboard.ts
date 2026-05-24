export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the local textarea copy path for locked-down browser contexts.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    document.execCommand("copy");
    // Some embedded browser surfaces do not return a reliable boolean after selection copy.
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}
