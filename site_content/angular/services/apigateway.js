angular
	.module('app')
	.service('apigateway', ['cognito', 'APIGATEWAY_URL', function(cognitoSvc, APIGATEWAY_URL) {
		var cache = {};

		return {
			
			deleteCustomer: function(customer) {

				customer = btoa(customer);

				params = {
					method: 'DELETE',
					url: 'https://' + APIGATEWAY_URL + '/v1/api/customer/' + customer,
					headers: {},
					body: ""
		        };

		        return new Promise((success, failure) => {
		        	$.ajax(cognitoSvc.signAPIRequest(params))
					.done((data) => {
						return success(data);
					}).fail((xhr, a, b) => {
						return failure(xhr);
					});
		        });
			},

			getCustomers: function(force = null) {

				if (cache.getCustomers && !force) {
					return Promise.resolve(cache.getCustomers);
				}

				params = {
					method: 'GET',
					url: 'https://' + APIGATEWAY_URL + '/v1/api/customer',
					headers: {}
		        };

		        return new Promise((success, failure) => {
		        	$.ajax(cognitoSvc.signAPIRequest(params))
					.done((data) => {

						console.log(JSON.parse(JSON.stringify(data)));

						cache.getCustomers = data;
						return success(data);
					}).fail((xhr, a, b) => {
						return failure(xhr);
					});
		        });
			},

			putCustomerEntry: function(entry) {

				if (!entry.customerName || !entry.accounts) {
					console.log("putCustomerEntry() received invalid entry")
					return Promise.reject();
				}

				params = {
					method: 'PUT',
					url: 'https://' + APIGATEWAY_URL + '/v1/api/customer',
					headers: {},
					body: JSON.stringify(entry)
		        };

		        return new Promise((success, failure) => {
		        	$.ajax(cognitoSvc.signAPIRequest(params))
					.done((data) => {
						return success(data);
					}).fail((xhr, a, b) => {
						return failure(xhr);
					});
		        });
			}
		}
	}]);