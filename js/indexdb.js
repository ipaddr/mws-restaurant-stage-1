class IndexDB{

    constructor(){
        this._restaurants = [];
        this._dbPromise = this.OPEN_DATABASE()
    }

    OPEN_DATABASE() {
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
    fetchRestaurants(callback) {
        // check memory cache first
        if (this._restaurants && this._restaurants.length > 0) {
            callback(null, this._restaurants);
            return;
        }

        var self = this;
        // check from index DB
        this._dbPromise.then(function(db){

            var tx = db.transaction('restaurants', 'readwrite');
            var store = tx.objectStore('restaurants');
            var index = store.index('by-id')

            return index.getAll().then(function(restaurants){
                self._restaurants = restaurants
                if (self._restaurants && self._restaurants.length > 0) {
                    callback(null, self._restaurants);
                    return;
                }

                // check from network
                fetch(IndexDB.DATABASE_URL)
                  .then(function(response) {
                    return response.json();
                  })
                  .then(function(jsonResponse) {
                    const strinJson = JSON.stringify(jsonResponse);
                    self._restaurants = JSON.parse(strinJson);
                    self._dbPromise.then(function(db){
                        if (!db) return;

                        var tx = db.transaction('restaurants', 'readwrite');
                        var store = tx.objectStore('restaurants');

                        self._restaurants.forEach(function(restaurant){
                            store.put(restaurant);
                        });

                        return;
                        });
                    });
                    callback(null, self._restaurants);
                  }).catch(function(error) {
                    const errorResponse = (`Request failed. Returned status of ${error}`);
                    callback(errorResponse, null);
                  });

        }).catch(function(error) {
            const errorResponse = (`Request failed. Returned status of ${error}`);
            callback(errorResponse, null);
        });
    }

    /**
    * Fetch a restaurant by its ID.
    */
    fetchRestaurantById(id, callback) {
        let restaurant;
        // check memory cache first
        if (this._restaurants && this._restaurants.length > 0) {
            let restaurant;
            for(var index in this._restaurants){
                restaurant = this._restaurants[index];
                if (restaurant.id == id) {
                    break;
                }
            }
            callback(null, restaurant);
            return;
        }

        var self = this;
        // get it from database
        this._dbPromise.then(function(db){
            var tx = db.transaction('restaurants');
            var store = tx.objectStore('restaurants');
            var index = store.index('by-id');
            return index.getAll();
        }).then(function(restaurants){
            self._restaurants = restaurants;
            for(var index in self._restaurants){
                restaurant = self._restaurants[index];
                if (restaurant.id == id) {
                    break;
                }
            }
            callback(null, restaurant);
            return;
        }).catch(function(error) {
            const errorResponse = (`Request failed. Returned status of ${error}`);
            callback(errorResponse, null);
        });
    }

    /**
    * Fetch restaurants by a cuisine type with proper error handling.
    */
    fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        this.fetchRestaurants((error, restaurants) => {
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
    fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        this.fetchRestaurants((error, restaurants) => {
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
    fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        this.fetchRestaurants((error, restaurants) => {
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
    fetchNeighborhoods(callback) {
        // Fetch all restaurants
        this.fetchRestaurants((error, restaurants) => {
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
    fetchCuisines(callback) {
        // Fetch all restaurants
        this.fetchRestaurants((error, restaurants) => {
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