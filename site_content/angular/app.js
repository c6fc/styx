angular
    .module('app', ["ngRoute"])
    .filter('prettyJson', function() {
    	return function(what) {
    		return JSON.stringify(what, null, ' ').trim();
    	};
    })
	.filter('count', function() {
		return function(items) {
			if (items == null) {
				return null;
			}

			if (typeof items == "object") {
				return Object.keys(items).length;
			}

			if (typeof items == "array") {
				return items.length;
			}

			console.log("filter::count = " + typeof items);

			return false;
		};
	})
	.filter('filterObj', function() {
		return function(items, keys) { // keys = {attr: value}
			var result = {};

			if (typeof keys != "object") {
				return {};
			}
			
			angular.forEach(items, function(value, key) {
				if (typeof value[Object.keys(keys)[0]] != "undefined") {
					if (value[Object.keys(keys)[0]] == keys[Object.keys(keys)[0]]) {
						result[key] = value;
					}
				}
			});

			return result;
		};
	})
	.filter('momentns', function () {
	    return function (input, momentFn /*, param1, param2, ...param n */) {
	  		var args = Array.prototype.slice.call(arguments, 2),
	        momentObj = moment(Date.now() + (input * 1000));

	        if (input == 0 && momentFn == 'fromNow') {
	        	return 'Instantly';
	        }

	        if (input == null) {
	        	return 'Maybe';
	        }

	    	return momentObj[momentFn].apply(momentObj, args);
	  	};
	})
	.filter('momentfn', function () {
	    return function (input, momentFn /*, param1, param2, ...param n */) {
	  		var args = Array.prototype.slice.call(arguments, 2),
	        momentObj = moment((input * 1000));

	        if (input == 0 && momentFn == 'fromNow') {
	        	return 'Instantly';
	        }

	        if (input == null) {
	        	return 'Maybe';
	        }

	    	return momentObj[momentFn].apply(momentObj, args);
	  	};
	})
	.directive('ngEnter', function() {
		return function(scope, element, attrs) {
			element.bind("keydown keypress", function(event) {
				if(event.which === 13) {
					scope.$apply(function(){
						scope.$eval(attrs.ngEnter);
					});

					event.preventDefault();
				}
			});
		};
	})
    .config(['$routeProvider', '$locationProvider', 'cognitoProvider', function($routeProvider, $locationProvider, cognitoProvider) {

    	// Set the cognitoProvider's unauthenticated redirect route.
    	cognitoProvider.setLogonRoute('/signin');

    	$locationProvider.hashPrefix('');

	   	$routeProvider
	   	.when('/', {
	   		templateUrl: "views/signin.html",
	   		controller: "logonCtrl",
	   		resolveRedirectTo: ['cognito', function(cognito) {
	   			return cognito.routeBlockLoggedOn("/dashboard");
	   		}]
	   	})
	   	.when('/signin', {
	   		templateUrl: "views/signin.html",
	   		controller: "logonCtrl",
	   		resolveRedirectTo: ['cognito', function(cognito) {
	   			return cognito.routeBlockLoggedOn("/dashboard");
	   		}]
	   	})
	   	.when('/forgot', {
	   		templateUrl: "views/reset.html",
	   		controller: "logonCtrl",
	   		resolveRedirectTo: ['cognito', function(cognito) {
	   			return cognito.routeBlockLoggedOn("/dashboard");
	   		}]
	   	})
	   	.when('/pwreset-confirm', {
	   		templateUrl: "views/confirm-reset.html",
	   		controller: "logonCtrl",
	   		resolveRedirectTo: ['cognito', function(cognito) {
	   			return cognito.routeBlockLoggedOn("/dashboard");
	   		}]
	   	})
	   	.when('/dashboard', {
	   		templateUrl: "views/dashboard.html",
	   		controller: "dashboardCtrl",
	   		resolveRedirectTo: ['cognito', function(cognito) {
	   			return cognito.routeRequireLogin();
	   		}]
	   	})
	   	.when('/credfile', {
	   		templateUrl: "views/credfile.html",
	   		controller: "credfileCtrl",
	   		resolveRedirectTo: ['cognito', function(cognito) {
	   			return cognito.routeRequireLogin();
	   		}]
	   	})
	   	.when('/logout', {
	   		templateUrl: "views/signout.html",
	   		controller: "logonCtrl"
	   	})
	   	.when('/account', {
	   		templateUrl: "views/account.html",
	   		controller: "accountCtrl",
	   		resolveRedirectTo: ['cognito', function(cognito) {
	   			return cognito.routeRequireLogin();
	   		}]
	   	})
	   	.when('/account/:account', {
	   		templateUrl: "views/account.html",
	   		controller: "accountCtrl",
	   		resolveRedirectTo: ['cognito', function(cognito) {
	   			return cognito.routeRequireLogin();
	   		}]
	   	})
	   	.otherwise({
	   		redirectTo: "/",
	   	});
    }])
    .directive('sidebar', function () {
    	return {
    		templateUrl: "sidebar.html"
    	};
    })
    ;

/*
var routeRequireLogon = function() {
	// console.log("Am logged in?: " + isLoggedOn());

	return new Promise((success, failure) => {
		if (!cognitoProvider.isLoggedOn()) {
			console.log('routeRequireLogon::isLoggedOn -> true');
			return success('/');
		}

		return success()
	);
};
*/