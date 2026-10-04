export default function GoogleAttribution({ attributions = [] }) {
  return <span className="mt-1 block text-xs font-normal not-italic text-[#5e5e5e]">
    <span translate="no" className="whitespace-nowrap">Google Maps</span>
    {attributions.map((entry, index) => <span key={index}> · {/^https:\/\//.test(entry.providerUri || "") ? <a href={entry.providerUri} target="_blank" rel="noreferrer" className="underline">{entry.provider}</a> : entry.provider}</span>)}
  </span>;
}
