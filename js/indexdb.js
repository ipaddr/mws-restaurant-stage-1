class IndexDB{

    static get OPEN_DATABASE() {
        // If the browser doesn't support service worker,
        // we don't care about having a database
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

      return idb.open('restaurant', 1, function(upgradeDb) {
        var store = upgradeDb.createObjectStore('restaurants', {
          keyPath: 'id'
        });
        store.createIndex('by-id', 'id');
      });
    }

    /**
    * Database URL.
    * Change this to restaurants.json file location on your server.
    */
    static get DATABASE_URL() {
        const port = 1337 // Change this to your server port
        return `http://localhost:${port}/restaurants`;
    }

    /**
    * Database URL.
    * Change this to restaurants.json file location on your server.
    */
    static get DATABASE_URL_ID() {
        const port = 1337 // Change this to your server port
        return `http://localhost:${port}/restaurants/${this.id}`;
    }

    /**
    * Fetch all restaurants.
    */
    static fetchRestaurants(callback) {
        IndexDB.OPEN_DATABASE.then(function(db){
            var tx = db.transaction('restaurants', 'readwrite');
            var store = tx.objectStore('restaurants');
            var index = store.index('by-id')

            return index.getAll().then(function(restaurants){

                if(restaurants && restaurants.length > 0){
                    callback(null, restaurants);
                    return;
                }

                fetch(IndexDB.DATABASE_URL)
                  .then(function(response) {
                    return response.json();
                  })
                  .then(function(jsonResponse) {
                    const strinJson = JSON.stringify(jsonResponse);
                    const restaurants = JSON.parse(strinJson);
                    IndexDB.OPEN_DATABASE.then(function(db){
                        if (!db) return;

                        var tx = db.transaction('restaurants', 'readwrite');
                        var store = tx.objectStore('restaurants');

                        restaurants.forEach(function(restaurant){
                            store.put(restaurant);
                        });

                        // limit store to 30 items
                        var index = store.index('by-id').openCursor(null, 'prev').then(function(cursor){
                            return cursor.advance(10);
                        }).then(function deleteRest(cursor){
                            if (!cursor) return;
                            cursor.delete();
                        return cursor.continue().then(deleteRest);
                        });
                    });
                    callback(null, restaurants);
                  }).catch(function(error) {
                    console.log(error);
                    const errorResponse = (`Request failed. Returned status of ${error}`);
                    callback(errorResponse, null);
                  });

        }).catch(function(error) {
            console.log(error);
            const errorResponse = (`Request failed. Returned status of ${error}`);
            callback(errorResponse, null);
        });
    });
}

    /**
    * Fetch a restaurant by its ID.
    */
    static fetchRestaurantById(id, callback) {
        IndexDB.OPEN_DATABASE.then(function(db){
            var tx = db.transaction('restaurants');
            var store = tx.objectStore('restaurants');
            var index = store.index('by-id');
            return index.getAll();
        }).then(function(restaurants){
            for(var index in restaurants){
                const restaurant = restaurants[index];
                if (restaurant.id == id) {
                    callback(null, restaurant);
                    break;
                }
            }
        }).catch(function(error) {
            console.log(error);
            const errorResponse = (`Request failed. Returned status of ${error}`);
            callback(errorResponse, null);
        });
    }

    /**
    * Fetch restaurants by a cuisine type with proper error handling.
    */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        IndexDB.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                callback(null, results);
            }
        });
    }

    /**
    * Fetch restaurants by a neighborhood with proper error handling.
    */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        IndexDB.fetchRestaurants((error, restaurants) => {
        if (error) {
            callback(error, null);
        } else {
            // Filter restaurants to have only given neighborhood
            const results = restaurants.filter(r => r.neighborhood == neighborhood);
            callback(null, results);
        }
        });
    }

    /**
    * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
    */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        IndexDB.fetchRestaurants((error, restaurants) => {
        if (error) {
            callback(error, null);
        } else {
            let results = restaurants
            if (cuisine != 'all') { // filter by cuisine
                results = results.filter(r => r.cuisine_type == cuisine);
            }
            if (neighborhood != 'all') { // filter by neighborhood
                results = results.filter(r => r.neighborhood == neighborhood);
            }
            callback(null, results);
        }
        });
    }

    /**
    * Fetch all neighborhoods with proper error handling.
    */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        IndexDB.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
    * Fetch all cuisines with proper error handling.
    */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        IndexDB.fetchRestaurants((error, restaurants) => {
        if (error) {
            callback(error, null);
        } else {
            // Get all cuisines from all restaurants
            const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
            // Remove duplicates from cuisines
            const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
            callback(null, uniqueCuisines);
        }
        });
    }

    /**
    * Restaurant page URL.
    */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
    * Restaurant image URL.
    */
    static imageUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.id}.jpg`);
    }

    /**
    * Map marker for a restaurant.
    */
    static mapMarkerForRestaurant(restaurant, map) {
        const marker = new google.maps.Marker({
        position: restaurant.latlng,
        title: restaurant.name,
        url: IndexDB.urlForRestaurant(restaurant),
        map: map,
        animation: google.maps.Animation.DROP}
        );
        return marker;
    }

}