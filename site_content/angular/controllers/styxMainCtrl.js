angular
   .module('app')
   .controller('styxMainCtrl', ['$timeout', '$scope', '$routeParams', '$location', '$window', 'cognito', 'styxDB', 'apigateway', function($timeout, $scope, $routeParams, $location, $window, cognitoSvc, styxDB, apigateway) {
      console.log("StyxMCtrl v0.0.1 loaded");

      /*
      $scope.cload_modal = new Custombox.modal({
         content: {
            effect: 'fadein',
            target: '#cload_modal'
         }
      });
      */

      $scope.apigateway = apigateway;
      $scope.styxDB = styxDB;

      $scope.updateSidebar = function() {
        $(".sidebar-menu a").removeClass("active").parent().removeClass("active");
        for (var i = window.location, o = $(".sidebar-menu a").filter(function() {
          return this.href == i;
          }).addClass("active").parent().addClass("active"); ;) {
          if (!o.is("li")) break;
          o = o.parent().addClass("in").parent().addClass("active");
        }
      };

      $scope.typeOf = function(what) {
        console.log(what);
        return typeof what;
      };

      $scope.$location = $location;
      $scope.notifications = [];

      /*
      window.isLoggedOn = function() {
        return cognitoSvc.isLoggedOn();
      };
      */

      // window.$$scope = $scope;

      $scope.handleLogin = function() {
          
          $scope.styxDB.init();

          $scope.user = {
            email: $scope.cognitoSvc.cognitoUserSession.idToken.payload.email,
            sub: AWS.config.credentials.identityId
          };

          $scope.gravatar = md5($scope.user.email);
      };

      // TRACK ROUTE CHANGES

      $scope.$on('$routeChangeSuccess', function() {
        $scope.location = $location.url();
        $scope.checkLocation();
        $('i.why').tooltip();
        $scope.updateSidebar();
      });

      $scope.showNav = false;
      $scope.checkLocation = function() {
        var hiddenNavPagePatterns = [
          /^\/$/,
          /^\/signin/,
          /^\/signup/,
          /^\/forgot/,
          /^\/pwreset-confirm/,
          /^\/logout/,
        ];

        $scope.showNav = true;
        hiddenNavPagePatterns.forEach(function(e) {
          if (e.test($location.url())) {
            $scope.showNav = false;
            return false;
          }
        });

        return $scope.showNav;
      };
      // END TRACK ROUTE CHANGES



      // DETERMINE IF READY, NOTIFY CHILDREN
      $scope.ready = false;
      $scope.cognitoSvc = cognitoSvc;

      $scope.cognitoSvc.onReady.then((data) => {
        $scope.ready = true;
        $scope.startApp();
      }, (e) => {
        console.log(e);
        $scope.ready = true;
        $scope.startApp();
      });

      $scope.appStarted = false;
      $scope.startApp = function() {
         if ($scope.appStarted == true) {
            // console.log("Cannot start app: already started.");
         } else {

            $scope.appStarted = true;
            $scope.$broadcast('styxMainCtrlReady');

            if ($scope.cognitoSvc.isLoggedOn()) {
              $scope.handleLogin();
            }
         }
      };
      // END READY

      $scope.ok_modal = {

        icon: "fa-star",
        title: "Uninit",
        body: "Uninit",
        accept: "OK",

        e: $('#ok_modal'),

        onAccept: function() {
          return true;
        },

        show: function() {
          this.e.modal('show');

          return this;
        },

        hide: function() {
          this.e.modal('hide');

          return this;
        },

        set: function(icon, title, body, accept, onAccept = null) {
          this.icon = icon;
          this.title = title;
          this.body = body;
          this.accept = accept;

          if (onAccept != null) {
            this.onAccept = onAccept;
          } else {
            this.onAccept = function() {
              return true;
            };
          }

          $scope.$apply();
          return this;
        }
      };

      $scope.retryPromise = (operation, delay, times) => new Promise((resolve, reject) => {
         return operation()
            .then(resolve)
            .catch((reason) => {
            if (times - 1 > 0) {
               return wait(delay)
                  .then($scope.retryPromise.bind(null, operation, delay, times - 1))
                  .then(resolve)
                  .catch(reject);
            }

            return reject(reason);
         });
      });
   }])
   angular
.module('app')
.controller('logonCtrl', ['$scope', '$routeParams', '$location', function($scope, $routeParams, $location) {

      $scope.active = false;
      $scope.name;
      $scope.username;
      $scope.password;
      $scope.newpassword;
      $scope.confirmpassword;
      $scope.verificationcode;

      $scope.onReady = function() {
         // console.log("logonCtrl loaded");
         $scope.$parent.startApp();
      };

      $scope.$on('$routeChangeSuccess', function() {
         
         $scope.onReady();

         if ($scope.$parent.$location.url() == "/logout") {
          $scope.signOut();
         }

      });

      $scope.signIn = function() {
        $scope.active = true;
        return $scope.$parent.cognitoSvc.authenticateUser($scope.username, $scope.password).then((data) => {
          // console.log("Successfully logged in: " + JSON.stringify(data));
          $scope.$parent.cognitoSvc.init();
          $scope.$parent.cognitoSvc.onReady.then(() => {
            $scope.$parent.handleLogin();
            $location.path('/dashboard');
            $scope.$apply();
          });
        }).catch((err) => {
          console.log(err);
          $scope.active = false;

          var errHandlerMap = {
            NotAuthorizedException: function() {
              return false;
            },

            ResetRequiredException: function() {
              setTimeout(function() {
                $('#adminCompleteAuth_modal').modal('show');
              });
            },

            UnknownError: function() {
              return false;
            },

            PasswordResetRequiredException: function() {
              $scope.$parent.$location.path('/forgot');
            }
          };

          $scope.$parent.ok_modal.set("fa-exclamation-circle", err.code, err.message, "OK", errHandlerMap[err.code]).show();
        });
      };

      $scope.adminCompleteAuth = function() {

        if ($scope.confirmpassword.length < 12) {
          $scope.newpassword = "";
          $scope.confirmpassword = "";

          $('#adminCompleteAuth_modal').effect('shake');
          return false;
        }

        if ($scope.newpassword != $scope.confirmpassword) {
          $('#confirmpassword').addClass('error').effect('shake');
          return false;
        }

        $("#adminCompleteAuth_submit").prop('disabled', true);

        $scope.$parent.cognitoSvc.completeAdminChallenge($scope.confirmpassword).then((data) => {
          $('#adminCompleteAuth_modal').modal('hide');
          $scope.password = $scope.newpassword;
          $scope.signIn();
        }).catch((e) => {
          console.log(e);
        });
      };

      $scope.resetPassword = function() {
        $scope.$parent.cognitoSvc.forgotPassword($scope.username).then((data) => {

          $("#reset_modal").modal('show');

        }).catch((e) => {
          $scope.$parent.ok_modal.set('fa-exclamation-triangle',
              'Error Resetting Password',
              e.message,
              "OK")
            .show();
        });
      };

      $scope.confirmReset = function() {

        if ($scope.confirmpassword.length < 12) {
          $scope.newpassword = "";
          $scope.confirmpassword = "";

          $('#adminCompleteAuth').effect('shake');
          return false;
        }

        if ($scope.newpassword != $scope.confirmpassword) {
          $('#confirmpassword').addClass('error').effect('shake');
          return false;
        }

        $("#adminCompleteAuth_submit").prop('disabled', true);

        $scope.$parent.cognitoSvc.resetPassword($scope.username, $scope.verificationcode, $scope.confirmpassword).then((data) => {
          $('#adminCompleteAuth').effect('hide');
          $scope.username = $scope.confirmpassword;
          $scope.signIn();
        }).catch((e) => {
          $scope.$parent.ok_modal.set(
              'fa-exclamation-triangle',
              'Error Resetting Password',
              "The following error occured while attempting a password reset: " + JSON.stringify(e),
              "OK")
            .show();
        });
      };

      $scope.signOut = function() {
        $scope.cognitoSvc.cognitoUser.signOut();

        setTimeout(function() {
          localStorage.clear();
          location.href = location.origin + location.pathname;
        }, 0);
      };
   }])
  .controller('dashboardCtrl', ['$scope', '$routeParams', '$timeout', 'APIGATEWAY_URL', function($scope, $routeParams, $timeout, APIGATEWAY_URL) {

      $scope.modalMessages = {success: [], warning: [], error: []};
      $scope.populateDashboard = function() {
        
        if ($scope.$parent.cognitoSvc.cognitoSigner == null) {
            setTimeout($scope.populateDashboard, 100);
            return false;
        }

        $scope.$parent.apigateway.getCustomers()
        .then((data) => {
          $scope.accounts = data.msg.customers;
          $scope.accounts_loaded = true;

          $scope.$digest();
          console.log(data);
        });
      };

      $scope.now = function() {
        return (new Date().getTime() / 1000).toFixed(0);
      };

      $scope.objLength = function(what) {
        if (typeof what == "undefined") { 
          return 0;
        }

        return Object.keys(what).length;
      };

      $scope.timedKeys = function(list) {
        var newlist = [];
        list.forEach(function(e) {
          if (/^\d+$/.test(e)) {
            newlist.push(e);
          }
        });

        return newlist;
      };

      $scope.timeout = "";
      $scope.tickTock = function() {
        $scope.populateDashboard();
        $timeout(function() {
          $scope.tickTock();
        }, 30000);
      };

      $scope.onReady = function() {
         $scope.$parent.startApp();

          window.dashboard = $scope;

          $scope.acccounts = {};
          $scope.acccounts_loaded = false;
      };

      $scope.$on('$routeChangeSuccess', function() {
         
         $scope.onReady();
         $scope.populateDashboard();

      });
   }])
  .controller('credfileCtrl', ['$scope', '$routeParams', '$timeout', 'APIGATEWAY_URL', function($scope, $routeParams, $timeout, APIGATEWAY_URL) {

      $scope.modalMessages = {success: [], warning: [], error: []};
      
      $scope.getCredfile = function(campaign_id) {

        if ($scope.$parent.cognitoSvc.cognitoSigner == null) {
            setTimeout($scope.getCredfile, 100);
            return false;
        }

        $scope.credfile_loaded = false;

        $scope.$parent.apigateway.getCustomers()
        .then((data) => {

          console.log(data);

          var error = false;
          if (typeof data != "object") {
            try {
              data = JSON.parse(data);
            } catch (e) {
              error = true;
              data = {msg: "Error parsing response JSON.", success: false};
            }
          }

          if (!error && data.success) {
            var credFileText = "# Styx-Generated Cred File\n\n";
            data.msg.customers.forEach(function(e) {

              if (!e.hasOwnProperty("customerName")) {
                return true;
              }

              console.log("Processing entry for " + e.customerName);

              e.accounts.forEach(function(account) {
                credFileText += "[styx_" + $scope.cliFriendly(e.customerName.toLowerCase()) + "_" + $scope.cliFriendly(account.name.toLowerCase()) + "]\n";
                credFileText += "role_arn = arn:aws:iam::" + account.number + ":role/" + account.roleName + "\n";
                credFileText += "source_profile = styx\n",
                credFileText += "mfa_serial = arn:aws:iam::" + data.accountId + ":mfa/" + data.msg.callerUsername + "\n\n";
              });
            });

            credFileText += "# End Styx-Generated Cred File";
            $scope.credfile = credFileText;
            $scope.$digest();
          } else {
            $scope.modalMessages.error = [data.msg];
            $scope.$digest();
            $('#messageModal').modal('show');
          }

          $scope.credfile_loaded = true;

        }, (err) => {

          try {
            data = JSON.parse(err);
          } catch (e) {
            data = {msg: e, success: false};
          }

          if (data.success == false) {
            $scope.modalMessages.error = [data.msg];
            $scope.$digest();
            $('#messageModal').modal('show');
          } else {
            $scope.credfile = atob(data.msg);
            $scope.$digest();
          }

        });
      };

      $scope.cliFriendly = function(what) {
        return what.toString().replace(/[^a-zA-Z0-9]/, "");
      };

      $scope.onReady = function() {
         $scope.$parent.startApp();

          window.dashboard = $scope;

          $scope.credfile = "";
          $scope.credfile_loaded = false;
          $scope.getCredfile();
      };

      $scope.$on('$routeChangeSuccess', function() {
         
         $scope.onReady();

      });
   }])
  .controller('accountCtrl', ['$scope', '$routeParams', '$timeout', 'APIGATEWAY_URL', function($scope, $routeParams, $timeout, APIGATEWAY_URL) {

      $scope.customer = null;
      $scope.subAccount = null;
      $scope.accounts = [];
      $scope.accountId = null;
      $scope.accounts_loaded = false;
      $scope.modalMessages = {success: [], warning: [], error: []};
      $scope.customersToDelete = [];
      
      $scope.populateView = function(force = null) {
        try {
          typeof $scope.$parent.styxDB;
        } catch (e) {
          return false;
        }

        $scope.$parent.styxDB.scan('styx', force).then((data) => {
          $scope.accounts = data;
          $scope.accounts_loaded = true;

          $scope.$digest();
          console.log(data);
        });
      };

      $scope.createCustomer = function() {

        var id = $scope.accounts.push({
          customerName: "! - New Customer",
          accounts: [{
            name: "! -New Subaccount",
            number: "",
            roleName: "OrganizationAdmins"
          }]
        });

        $scope.showAccount($scope.accounts[id - 1]);
      };

      $scope.createSubAccount = function() {
        var id = $scope.customer.accounts.push({
            name: "! -New Subaccount",
            number: "",
            roleName: "OrganizationAdmins"
          });

        $scope.showSubAccount($scope.customer.accounts[id - 1]);
      };

      $scope.showAccount = function(accountObj) {
        $scope.customer = accountObj;
        
        $scope.showSubAccount($scope.customer.accounts[0]);
      };

      $scope.showSubAccount = function(subAccountObj) {
        $scope.subAccount = subAccountObj;
      };

      $scope.toggleGlobal = function() {
        $scope.customer.isGlobal = ($scope.customer.isGlobal == "TRUE") ? "FALSE" : "TRUE";
      }

      $scope.onReady = function() {
         $scope.$parent.startApp();

         $scope.populateView();
      };

      $scope.editCustomerName = function() {
        $scope.newCustomerName = $scope.customer.customerName.toString();
        $('#editCustomerNameModal').modal('show');
      };

      $scope.commitCustomerName = function() {
        var oldName = $scope.customer.customerName;

        var newAccounts = [];
        
        newAccounts.push({
          customerName: $scope.newCustomerName,
          accounts: $scope.customer.accounts
        });

        $scope.deleteCustomer(oldName);

        $scope.accounts = newAccounts;
        

        $('#editCustomerNameModal').modal('hide');
        $scope.saveCustomers();
      };

      $scope.deleteCustomer = function(name = null) {

        name = name || $scope.customer.customerName;

        var newAccounts = [];
        $scope.accounts.forEach(function(e) {
          if (e.customerName == name) {
            return false;
          }

          newAccounts.push(e);
        });

        $scope.accounts = newAccounts;

        $scope.customersToDelete.push(name);
      }

      $scope.deleteSubAccount = function(name = null) {

        name = name || $scope.subAccount.name;

        var newAccounts = [];
        $scope.customer.accounts.forEach(function(e) {
          if (e.name == name) {
            return false;
          }

          newAccounts.push(e);
        });

        $scope.customer.accounts = newAccounts;

        if (newAccounts.length > 0) {
          $scope.showSubAccount($scope.customer.accounts[0]);
        } else {
          $scope.createSubAccount();
        }
      }

      $scope.saveCustomers = function() {
        var promises = [];
        $('#saveModal').modal('show');

        $scope.accounts.forEach(function(a) {
          promises.push($scope.$parent.apigateway.putCustomerEntry(JSON.parse(angular.toJson(a))));
        });

        $scope.customersToDelete.forEach(function(c) {
          promises.push($scope.$parent.apigateway.deleteCustomer(c));
        });

        Promise.allSettled(promises).then((results) => {
          $('#saveModal').modal('hide');
          $scope.populateView(true);

          $scope.$digest();
        });

      };

      $scope.cliFriendly = function(what) {
        return what.toString().replace(/[^a-zA-Z0-9]/, "");
      };

      $scope.trustPolicy = function() {
        if (!$scope.customer || !$scope.customer.customerName) {
          return "";
        }

        if ($scope.customer.isGlobal == "TRUE") {
          return "";
        }

        return JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: {
                  AWS: "arn:aws:iam::" + data.account_id + ":root"
                },
                Action: "sts:AssumeRole",
                Condition: {
                    "ForAllValues:StringEquals": {
                      ["aws:PrincipalTag/Styx-" + $scope.cliFriendly($scope.customer.customerName)]: "Admin",
                      "aws:PrincipalType": "User"
                  },
                  Bool: {
                    "aws:MultiFactorAuthPresent": "true"
                  }
                }
              },
              {
                Effect: "Allow",
                Principal: {
                  AWS: "arn:aws:iam::" + data.account_id + ":user/terraform"
                },
                Action: "sts:AssumeRole"
              }
            ]
          }, null, 3);
      }

      $scope.$on('$routeChangeSuccess', function() {
         
         $scope.onReady();
      });
   }])
  ;

