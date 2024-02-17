export const getLocalFavourites = (): Array<string> => {
  const localFavourites = localStorage.getItem('tvass-favourites');
  if (localFavourites) {
    return localFavourites.split(',');
  }
  return [];
};
