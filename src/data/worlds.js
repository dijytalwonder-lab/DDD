/**
 * The ten festival worlds.
 *
 * Gameplay is identical in every world - a world is a visual theme plus its
 * level table. Only the Village Festival is built for this first release; the
 * other nine are declared here (locked) so the world-select screen can show
 * the whole journey and later releases only add a level table + art.
 *
 * `bg` names a texture key from data/assets.js. When a world has no art yet it
 * reuses the village backdrop tinted by `tint`, so the map still reads as ten
 * distinct places.
 */

export const WORLDS = [
    {
        id: "village",
        name: "Village Festival",
        blurb: "Mud houses, rangoli and warm diya lights.",
        icon: "🏡",
        bg: "bg_village",
        tint: 0xffffff,
        unlocked: true,
        ready: true
    },
    { id: "temple",   name: "Temple Street",      blurb: "Temple steps, bells and flower lamps.", icon: "🛕", bg: "bg_village", tint: 0xffd9a0, ready: false },
    { id: "harvest",  name: "Harvest Village",    blurb: "Fields, haystacks and festive homes.",  icon: "🌾", bg: "bg_village", tint: 0xf7e08a, ready: false },
    { id: "riverside",name: "Riverside Festival", blurb: "River ghats, boats and diya reflections.", icon: "🌊", bg: "bg_village", tint: 0x9fd4e8, ready: false },
    { id: "royal",    name: "Royal City",         blurb: "Palaces and decorated royal courtyards.", icon: "🏰", bg: "bg_village", tint: 0xe0b3ff, ready: false },
    { id: "mountain", name: "Mountain Town",      blurb: "Mountain houses and winding lanes.",     icon: "🏔️", bg: "bg_village", tint: 0xbfe0ff, ready: false },
    { id: "coastal",  name: "Coastal Village",    blurb: "Palm trees, seaside homes and boats.",   icon: "🌴", bg: "bg_village", tint: 0xa8e6c8, ready: false },
    { id: "sacred",   name: "Sacred Town",        blurb: "Lotus ponds and sacred lamps.",          icon: "🪷", bg: "bg_village", tint: 0xffc0e0, ready: false },
    { id: "grand",    name: "Grand Festival City",blurb: "Big city streets, crowds and lights.",   icon: "✨", bg: "bg_village", tint: 0xffcf80, ready: false },
    { id: "divine",   name: "Divine Festival",    blurb: "Glowing skies and divine light.",        icon: "🌌", bg: "bg_village", tint: 0xc9b8ff, ready: false }
];

export function worldById(id) {
    return WORLDS.find(w => w.id === id);
}

export function worldIndex(id) {
    return WORLDS.findIndex(w => w.id === id);
}
