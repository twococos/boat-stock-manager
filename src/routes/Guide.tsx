import { EmptyState } from '@/components/ui/common';
import { Book } from '@/components/ui/icons';
import { t } from '@/text';
import { guideSections, GUIDE_ICONS, type GuideBlock } from '@/content/guide';

/**
 * Guia del vaixell: manual de consulta ràpida per a la tripulació. Pàgina contínua
 * amb un índex a dalt; tocar un tema fa scroll fins a la seva secció (àncora per `id`).
 * Tot el contingut viu a src/content/guide.ts — aquí només hi ha el renderer.
 */
export function Guide() {
  if (guideSections.length === 0) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <h1 className="text-xl font-bold">{t.guide.title}</h1>
        <EmptyState icon={Book} text={t.guide.empty} />
      </div>
    );
  }

  function goTo(id: string) {
    document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{t.guide.title}</h1>
        <p className="text-sm text-boat-500">{t.guide.intro}</p>
      </header>

      {/* Índex: salta a la secció */}
      <nav className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-boat-700">{t.guide.indexTitle}</h2>
        <ul className="grid grid-cols-2 gap-2">
          {guideSections.map((s) => {
            const Icon = GUIDE_ICONS[s.icon];
            return (
              <li key={s.id}>
                <button
                  onClick={() => goTo(s.id)}
                  className="flex w-full items-center gap-2 rounded-2xl bg-white p-3 text-left shadow-sm active:scale-[0.98]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-boat-100 text-boat-700">
                    <Icon size={20} />
                  </span>
                  <span className="text-sm font-semibold leading-tight">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Seccions contínues */}
      <div className="flex flex-col gap-4">
        {guideSections.map((s) => {
          const Icon = GUIDE_ICONS[s.icon];
          return (
            <section
              key={s.id}
              id={`guide-${s.id}`}
              // scroll-mt: deixa marge sota la capçalera fixa en saltar-hi.
              className="scroll-mt-20 rounded-2xl bg-white p-4 shadow-sm"
            >
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-boat-900">
                <span className="flex h-8 w-8 items-center justify-center text-boat-700">
                  <Icon size={24} />
                </span>
                {s.title}
              </h2>
              <div className="flex flex-col gap-3">
                {s.blocks.map((block, i) => (
                  <GuideBlockView key={i} block={block} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Renderitza un bloc de contingut segons el seu `kind`. */
function GuideBlockView({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p className="text-[15px] leading-relaxed text-boat-900">{block.text}</p>;

    case 'steps':
      return (
        <ol className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-boat-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[15px] leading-relaxed text-boat-900">{item}</span>
            </li>
          ))}
        </ol>
      );

    case 'list':
      return (
        <ul className="flex flex-col gap-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-boat-900">
              <span className="select-none text-boat-400">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'image':
      return (
        <figure className="flex flex-col gap-1">
          <img
            src={import.meta.env.BASE_URL + block.src}
            alt={block.caption ?? ''}
            loading="lazy"
            className="w-full rounded-2xl object-cover"
          />
          {block.caption && (
            <figcaption className="px-1 text-xs text-boat-500">{block.caption}</figcaption>
          )}
        </figure>
      );

    case 'note':
      return (
        <p className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-[15px] leading-relaxed text-amber-900">
          {block.text}
        </p>
      );
  }
}
