/ data processing

.cache.attended:([h:();username:()]data:());
.cache.geocode:([h:();username:()]data:());

.data.attended:{[dict]                                                                          / [params] get attended events for a user, checking for cached events;
  if[(k:dict`h`username)in key .cache.attended;                                                 / check if results are cached
    .log.o("Returning cached events for {}";dict`username);
    :.cache.attended[k]`data;                                                                   / return data from cache
  ];
  .log.o("No cached results for {}";dict`username);
  res:.http.attended dict`username;                                                             / get results via http request to setlist.fm
  `.cache.attended upsert dict[`h`username],enlist res;
  :res;
 };

.data.geocode.venue:{[params]
  .log.o("Geocoding: {}";params`q);
  res:.http.req.nominatim params;
  if[0h=type res;:`lat`long!0n 0n];
  :`lat`long!raze"F"$res`lat`lon;
 };

.data.geocode.all:{[dict;vnl]                                                                   / [user inputs;venue info]
  if[(k:dict`h`username)in key .cache.geocode;                                                  / check if results are cached
    .log.o("Returning cached geocoding data for {}";dict`username);
    :.cache.geocode[k]`data;                                                                    / return data from cache
  ];
  ven:update q:", "sv/:flip(venue;city;state;country),limit:1 from vnl;                         / find venue coordinates, if they exists
  ven:ven,'.data.geocode.venue'[`q`limit#ven];
  ven:0!(^/)`venue`city`country xkey/:`venue`city`country`lat`long#/:(vnl;ven);                 / join results, filling null venue coords with city values
  ven:`venue`lat`long#ven;
  `.cache.geocode upsert dict[`h`username],enlist ven;                                          / cache results
  :ven;
 };

.data.markers:{[dict;data]                                                                      / [inputs;venue info]
  vnl:distinct select city,venue,state,country,lat,long from data;                              / select city coordinates
  m:value each .data.geocode.all[dict;vnl];                                                     / geocode venues
  :`markers`bounds!(m;(min;max)@\:m[;1 2]);
 };

.data.venues:{[dict;data]
  data:select from data where venue in enlist dict`venue;
  .ui.format[`table;(`time`rows`data)!(`int$(.z.p-.z.p)%1000000;count data;data)]
 };
