import { TEILNEHMER_TEMP_PIN } from "../constants";

export default function TeilnehmerPinHint() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900">
      <strong>Temporärer PIN für Teilnehmer:</strong>{" "}
      <code className="font-mono font-bold text-base mx-1">{TEILNEHMER_TEMP_PIN}</code>
      — gilt für neue Accounts und nach PIN-Reset. Beim ersten Login wählen Teilnehmende
      einen eigenen PIN.
    </div>
  );
}
