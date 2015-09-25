(function (angular) {
    angular
        .module('placesWidget')
        .controller('WidgetSectionsCtrl', ['$scope', '$window', 'DB', 'COLLECTIONS', 'DEFAULT_VIEWS', '$rootScope', 'Buildfire', 'AppConfig', 'Messaging', 'EVENTS', 'PATHS', 'Location', 'Orders', 'PlaceInfo',
            function ($scope, $window, DB, COLLECTIONS, DEFAULT_VIEWS, $rootScope, Buildfire, AppConfig, Messaging, EVENTS, PATHS, Location, Orders, PlaceInfo) {

                var WidgetSections = this;
                WidgetSections.info = PlaceInfo;

                var view = null,
                    currentLayout = '',
                    _skip = 0,
                    _limit = 5,
                    searchOptions = {
                        //filter: {"$json.secTitle": {"$regex": '/*'}},
                        skip: _skip,
                        limit: _limit + 1 // the plus one is to check if there are any more
                    };

                if (WidgetSections.info && WidgetSections.info.data && WidgetSections.info.data.settings && WidgetSections.info.data.settings.defaultView) {
                    switch (WidgetSections.info.data.settings.defaultView) {
                        case DEFAULT_VIEWS.LIST:
                            currentLayout = WidgetSections.info.data.design.secListLayout;
                            break;
                        case DEFAULT_VIEWS.MAP:
                            currentLayout = WidgetSections.info.data.design.mapLayout;
                            break;
                    }
                }

                /**
                 * WidgetSections.isBusy is used for infinite scroll.
                 * @type {boolean}
                 */
                WidgetSections.isBusy = false;

                /**
                 * Create instance of Sections db collection
                 * @type {DB}
                 */
                var Sections = new DB(COLLECTIONS.Sections);

                /**
                 * updateGetOptions method checks whether sort options changed or not.
                 * @returns {boolean}
                 */
                var updateGetOptions = function () {
                    var order = Orders.getOrder(WidgetSections.info.data.content.sortBy || Orders.ordersMap.Default);
                    if (order) {
                        var sort = {};
                        sort[order.key] = order.order;
                        searchOptions.sort = sort;
                        return true;
                    }
                    else {
                        return false;
                    }
                };

                /**
                 * WidgetSections.items holds the array of items.
                 * @type {Array}
                 */
                WidgetSections.sections = [];
                /**
                 * WidgetSections.noMore checks for further data
                 * @type {boolean}
                 */
                WidgetSections.noMore = false;

                /**
                 * loadMore method loads the items in list page.
                 */
                WidgetSections.loadMore = function () {
                    if (WidgetSections.isBusy && !WidgetSections.noMore) {
                        return;
                    }
                    updateGetOptions();
                    WidgetSections.isBusy = true;

                    Sections.find(searchOptions).then(function success(result) {
                        if (WidgetSections.noMore)
                            return;
                        if (result.length <= _limit) {// to indicate there are more
                            WidgetSections.noMore = true;
                        }
                        else {
                            result.pop();
                            searchOptions.skip = searchOptions.skip + _limit;
                            WidgetSections.noMore = false;
                        }
                        WidgetSections.sections = WidgetSections.sections ? WidgetSections.sections.concat(result) : result;
                        WidgetSections.isBusy = false;
                    }, function fail() {
                        WidgetSections.isBusy = false;
                        console.error('error');
                    });
                };

                function refreshSections() {
                    WidgetSections.sections = [];
                    WidgetSections.noMore = false;
                    WidgetSections.loadMore();
                    $scope.$apply();
                }

                /**
                 * Buildfire.datastore.onUpdate method calls when Data is changed.
                 */
                var initCarousel = function (_defaultView) {
                    function resetCarousel(_layout) {
                        if (currentLayout != _layout && view && WidgetSections.info.data.content.images) {
                            if (WidgetSections.info.data.content.images.length)
                                view._destroySlider();
                            view = null;
                        }
                        else {
                            if (view) {
                                view.loadItems(WidgetSections.info.data.content.images);
                            }
                        }
                    }

                    switch (_defaultView) {
                        case DEFAULT_VIEWS.LIST:
                            resetCarousel(WidgetSections.info.data.design.secListLayout);
                            break;
                        case DEFAULT_VIEWS.MAP:
                            resetCarousel(WidgetSections.info.data.design.mapLayout);
                            break;
                    }
                };

                initCarousel(WidgetSections.info.data.settings.defaultView);

                Buildfire.datastore.onUpdate(function (event) {
                    if (event.tag == "placeInfo") {
                        if (event.data) {
                            WidgetSections.info = event;
                            initCarousel(WidgetSections.info.data.settings.defaultView);
                            refreshSections();
                        }
                    }
                    else {
                        view = null;
                        currentLayout = '';
                        refreshSections();
                    }
                });

                $rootScope.$on("Carousel:LOADED", function () {
                    if (!view) {
                        view = new Buildfire.components.carousel.view("#carousel", []);
                    }
                    if (WidgetSections.info.data.content && WidgetSections.info.data.content.images) {
                        view.loadItems(WidgetSections.info.data.content.images);
                    } else {
                        view.loadItems([]);
                    }
                });

            }]);
})(window.angular, undefined);