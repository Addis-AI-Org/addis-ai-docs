import pricing from '@/data/pricing.v1.json';

type PriceLine = {
  label?: string;
  amount: number;
  currency: string;
  unit: string;
  estimate?: boolean;
};

type PricingModel = {
  id: string;
  name: string;
  modality: string;
  status: string;
  lines: PriceLine[];
  note?: string;
};

export function PricingTable() {
  // Keep deprecated products in the release data for migration checks, but
  // present only current products on the primary pricing page.
  const models = (pricing.models as PricingModel[]).filter(
    (model) => model.status !== 'deprecated',
  );

  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-fd-muted/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Capability</th>
            <th className="px-4 py-3 font-semibold">Price</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr className="border-b last:border-0" key={model.id}>
              <td className="px-4 py-3 align-top">
                <div className="font-medium">{model.name}</div>
                <div className="text-xs text-fd-muted-foreground">{model.modality}</div>
              </td>
              <td className="px-4 py-3 align-top">
                {model.lines.map((line) => (
                  <div key={`${line.label ?? 'price'}-${line.unit}`}>
                    {line.label ? `${line.label}: ` : ''}
                    {line.estimate ? '~' : ''}{line.amount} {line.currency} {line.unit}
                  </div>
                ))}
                {model.note ? (
                  <div className="mt-1 text-xs text-fd-muted-foreground">{model.note}</div>
                ) : null}
              </td>
              <td className="px-4 py-3 align-top capitalize">{model.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
