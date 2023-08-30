window.isLoggedIn =
  global.location.search.split('=').length === 2
    ? global.location.search.split('=')[1]
    : 'false';
