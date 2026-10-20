export function getGameCover(id:number){

    const base="/assets/games/games";

    return [
        `${base}${id}.webp`,
        `${base}${id}.png`,
        `${base}${id}.jpg`
    ];

}