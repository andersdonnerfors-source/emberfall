zones.over=genOverworld();addHints(zones.over);addInnkeepers(zones.over);useZone(zones.over);zones.over.terrain=genTerrain();useZone(zones.over);
buildSprites();buildZoneSprites();refreshTitle();$('profClose').onclick=()=>toggleProf(false);requestAnimationFrame(frame);
