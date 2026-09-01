import './public.css';

/* The grid break, once per page — and the one piece of motion in the whole
   product. It runs flush against the band above and the footer below, and
   drifts continuously left so it is never a tidy row of cards.

   The sequence is rendered twice. The animation translates by exactly half
   the track, so the moment the first copy has fully left, the second copy is
   sitting precisely where the first began and the loop is seamless — no
   jump, no reset.

   Decorative, so the whole track is hidden from screen readers: naming eleven
   photographs of infrastructure tells a non-sighted reader nothing the page
   has not already said.

   Filenames are fixed and content-neutral so the photographs can be replaced
   by dropping files into public/photos — see the README there. */

const PHOTOS = Array.from({ length: 11 }, (_, i) => `/photos/strip-${i + 1}.jpg`);

export default function PhotoStrip() {
  return (
    <div className="strip" aria-hidden="true">
      <div className="strip__track">
        {/* Two passes of the same sequence — see the note above. */}
        {[...PHOTOS, ...PHOTOS].map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="strip__item"
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>
    </div>
  );
}
