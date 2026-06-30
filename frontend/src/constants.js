/** Fixed temporary PIN for participants (must match backend TEILNEHMER_TEMP_PIN). */
export const TEILNEHMER_TEMP_PIN = "0000";

export function copyText(text) {
  const doFallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  };
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text).catch(doFallback);
  }
  doFallback();
  return Promise.resolve();
}
