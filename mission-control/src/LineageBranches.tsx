import type { Branch, Item } from './lineageWalk'

/** One lineage tree as nested lists; a premise that has expired says so beside its id. */
export function LineageBranches({ branches, items, label }: { branches: Branch[]; items: Map<string, Item>; label?: string }) {
  return (
    <ul aria-label={label}>
      {branches.map((b) => {
        const item = items.get(b.id)
        return (
          <li key={`${b.via}-${b.id}`} data-expired={item?.expired ? 'true' : undefined}>
            <a href={item?.href}>{b.id}</a> <span className="muted">{b.via}</span> {item?.title}
            {item?.status && <> <span className={item.expired ? 'expired' : 'muted'}>{item.expired ? `✕ ${item.status}` : item.status}</span></>}
            {b.seen && <span className="muted"> (above)</span>}
            {b.children.length > 0 && <LineageBranches branches={b.children} items={items} />}
          </li>
        )
      })}
    </ul>
  )
}
