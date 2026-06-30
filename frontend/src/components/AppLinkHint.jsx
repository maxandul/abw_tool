import { useEffect, useState } from "react";
import { getServerUrl } from "../api/admin";
import { copyText, TEILNEHMER_TEMP_PIN } from "../constants";
import Spinner from "./Spinner";

/** Admin hint: copy the stable app URL (hostname-based) for e-mail distribution. */
export default function AppLinkHint() {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getServerUrl().then(({ data }) => {
      setLoading(false);
      if (data?.app_url) setUrl(data.app_url);
    });
  }, []);

  const handleCopy = () => {
    if (!url) return;
    copyText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card space-y-2">
      <h2 className="text-sm font-semibold text-slate-700">Link zur App</h2>
      <p className="text-sm text-slate-500">
        Diesen Link per E-Mail oder Teams an Teilnehmende senden. Sie landen auf der
        Login-Seite und sehen nach der Anmeldung ihre Erhebungen in der Titelleiste.
        Neukonten melden sich mit temporärem PIN{" "}
        <strong className="font-mono">{TEILNEHMER_TEMP_PIN}</strong> an.
      </p>
      {loading ? (
        <Spinner size="sm" />
      ) : url ? (
        <div className="flex flex-wrap gap-3 items-center">
          <code className="text-xs bg-slate-100 px-2 py-1.5 rounded break-all flex-1 min-w-0">
            {url}
          </code>
          <button type="button" className="btn-primary text-sm shrink-0" onClick={handleCopy}>
            {copied ? "Kopiert!" : "Link kopieren"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Server-URL konnte nicht ermittelt werden.</p>
      )}
    </div>
  );
}
