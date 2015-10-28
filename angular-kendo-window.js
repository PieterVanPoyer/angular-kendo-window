angular.module('kendo.window', [])
    .factory('$$stackedMap', function () {
    return {
        createNew: function () {
            var stack = [];
            return {
                add: function (key, value) {
                    stack.push({
                        key: key,
                        value: value
                    });
                },
                get: function (key) {
                    for (var i = 0; i < stack.length; i++) {
                        if (key == stack[i].key) {
                            return stack[i];
                        }
                    }
                },
                keys: function () {
                    var keys = [];
                    for (var i = 0; i < stack.length; i++) {
                        keys.push(stack[i].key);
                    }
                    return keys;
                },
                top: function () {
                    return stack[stack.length - 1];
                },
                remove: function (key) {
                    var idx = -1;
                    for (var i = 0; i < stack.length; i++) {
                        if (key == stack[i].key) {
                            idx = i;
                            break;
                        }
                    }
                    return stack.splice(idx, 1)[0];
                },
                removeTop: function () {
                    return stack.splice(stack.length - 1, 1)[0];
                },
                length: function () {
                    return stack.length;
                }
            };
        }
    };
})
    .factory('$$multiMap', function () {
    return {
        createNew: function () {
            var map = {};
            return {
                entries: function () {
                    return Object.keys(map).map(function (key) {
                        return {
                            key: key,
                            value: map[key]
                        };
                    });
                },
                get: function (key) {
                    return map[key];
                },
                hasKey: function (key) {
                    return !!map[key];
                },
                keys: function () {
                    return Object.keys(map);
                },
                put: function (key, value) {
                    if (!map[key]) {
                        map[key] = [];
                    }
                    map[key].push(value);
                },
                remove: function (key, value) {
                    var values = map[key];
                    if (!values) {
                        return;
                    }
                    var idx = values.indexOf(value);
                    if (idx !== -1) {
                        values.splice(idx, 1);
                    }
                    if (!values.length) {
                        delete map[key];
                    }
                }
            };
        }
    };
})
    .directive('uibModalWindow', [
    '$uibModalStack', '$q', '$animate', '$injector',
    function ($modalStack, $q, $animate, $injector) {
        var $animateCss = null;
        if ($injector.has('$animateCss')) {
            $animateCss = $injector.get('$animateCss');
        }
        return {
            scope: {
                index: '@'
            },
            replace: true,
            transclude: true,
            templateUrl: function (tElement, tAttrs) {
                return tAttrs.templateUrl || 'window.html';
            },
            link: function (scope, element, attrs) {
                element.addClass(attrs.windowClass || '');
                element.addClass(attrs.windowTopClass || '');
                scope.size = attrs.size;
                scope.close = function (evt) {
                    var modal = $modalStack.getTop();
                    if (modal && evt !== null && evt.target === evt.currentTarget) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    }
                };
                var windowOptions = $modalStack.getTop().value;
                var opts = {
                    modal: true,
                    title: windowOptions.title,
                    deactivate: function () {
                        scope.done();
                    },
                    activate: function () {
                        windowOptions.openedDeferred.resolve(true);
                    },
                    visible: false,
                    width: 500,
                    actions: ["Close"]
                };
                if (windowOptions.width) {
                    opts.width = windowOptions.width;
                }
                if (windowOptions.height) {
                    opts.height = windowOptions.height;
                }
                if (windowOptions.draggable !== undefined) {
                    opts.draggable = windowOptions.draggable;
                }
                if (windowOptions.resizable !== undefined) {
                    opts.resizable = windowOptions.resizable;
                }
                if (windowOptions.modal !== undefined) {
                    opts.modal = windowOptions.modal;
                }
                if (windowOptions.actions) {
                    opts.actions = windowOptions.actions;
                }
                if (windowOptions.noMaxHeight === undefined || windowOptions.noMaxHeight === false) {
                    if (windowOptions.maxHeight) {
                        opts.maxHeight = windowOptions.maxHeight;
                    }
                    else {
                        opts.maxHeight = 600;
                        opts.resizable = false;
                    }
                }
                if (windowOptions.center === null || windowOptions.center === false) {
                    var x = $(window).width() / 2;
                    var y = $(window).height() / 2;
                    var h = 600;
                    if (opts.height) {
                        h = opts.height;
                    }
                    opts.position = {
                        top: y - (h / 2),
                        left: x - (opts.width / 2)
                    };
                }
                scope.options = opts;
                // moved from template to fix issue #2280
                element.on('click', scope.close);
                // This property is only added to the scope for the purpose of detecting when this directive is rendered.
                // We can detect that by using this property in the template associated with this directive and then use
                // {@link Attribute#$observe} on it. For more details please see {@link TableColumnResize}.
                scope.$isRendered = true;
                // Deferred object that will be resolved when this modal is render.
                var modalRenderDeferObj = $q.defer();
                // Observe function will be called on next digest cycle after compilation, ensuring that the DOM is ready.
                // In order to use this way of finding whether DOM is ready, we need to observe a scope property used in modal's template.
                attrs.$observe('modalRender', function (value) {
                    if (value == 'true') {
                        modalRenderDeferObj.resolve();
                    }
                });
                modalRenderDeferObj.promise.then(function () {
                    var animationPromise = null;
                    scope.myKendoWindow.open().center();
                    scope.$on($modalStack.NOW_CLOSING_EVENT, function (e, setIsAsync) {
                        scope.done = setIsAsync();
                        scope.myKendoWindow.close();
                    });
                    $q.when(animationPromise).then(function () {
                        var inputsWithAutofocus = element[0].querySelectorAll('[autofocus]');
                        /**
                         * Auto-focusing of a freshly-opened modal element causes any child elements
                         * with the autofocus attribute to lose focus. This is an issue on touch
                         * based devices which will show and then hide the onscreen keyboard.
                         * Attempts to refocus the autofocus element via JavaScript will not reopen
                         * the onscreen keyboard. Fixed by updated the focusing logic to only autofocus
                         * the modal element if the modal does not contain an autofocus element.
                         */
                        if (inputsWithAutofocus.length) {
                            inputsWithAutofocus[0].focus();
                        }
                        else {
                            element[0].focus();
                        }
                    });
                    // Notify {@link $modalStack} that modal is rendered.
                    var modal = $modalStack.getTop();
                    if (modal) {
                        $modalStack.modalRendered(modal.key);
                    }
                });
            }
        };
    }])
    .directive('uibModalTransclude', function () {
    return {
        link: function ($scope, $element, $attrs, controller, $transclude) {
            $transclude($scope.$parent, function (clone) {
                $element.empty();
                $element.append(clone);
            });
        }
    };
})
    .factory('$uibModalStack', [
    '$animate', '$timeout', '$document', '$compile', '$rootScope',
    '$q',
    '$injector',
    '$$multiMap',
    '$$stackedMap',
    function ($animate, $timeout, $document, $compile, $rootScope, $q, $injector, $$multiMap, $$stackedMap) {
        var $animateCss = null;
        if ($injector.has('$animateCss')) {
            $animateCss = $injector.get('$animateCss');
        }
        var OPENED_MODAL_CLASS = 'modal-open';
        var openedWindows = $$stackedMap.createNew();
        var openedClasses = $$multiMap.createNew();
        var $modalStack = {
            NOW_CLOSING_EVENT: 'modal.stack.now-closing'
        };
        //Modal focus behavior
        var focusableElementList;
        var focusIndex = 0;
        var tababbleSelector = 'a[href], area[href], input:not([disabled]), ' +
            'button:not([disabled]),select:not([disabled]), textarea:not([disabled]), ' +
            'iframe, object, embed, *[tabindex], *[contenteditable=true]';
        function removeModalWindow(windowInstance, elementToReceiveFocus) {
            var body = $document.find('body').eq(0);
            var modalWindow = openedWindows.get(windowInstance).value;
            //clean up the stack
            openedWindows.remove(windowInstance);
            removeAfterAnimate(modalWindow.modalDomEl, modalWindow.modalScope, function () {
                var modalBodyClass = modalWindow.openedClass || OPENED_MODAL_CLASS;
                openedClasses.remove(modalBodyClass, windowInstance);
                body.toggleClass(modalBodyClass, openedClasses.hasKey(modalBodyClass));
                toggleTopWindowClass(true);
            });
            //move focus to specified element if available, or else to body
            if (elementToReceiveFocus && elementToReceiveFocus.focus) {
                elementToReceiveFocus.focus();
            }
            else {
                body.focus();
            }
        }
        // Add or remove "windowTopClass" from the top window in the stack
        function toggleTopWindowClass(toggleSwitch) {
            var modalWindow;
            if (openedWindows.length() > 0) {
                modalWindow = openedWindows.top().value;
                modalWindow.modalDomEl.toggleClass(modalWindow.windowTopClass || '', toggleSwitch);
            }
        }
        function removeAfterAnimate(domEl, scope, done) {
            var asyncDeferred;
            var asyncPromise = null;
            var setIsAsync = function () {
                if (!asyncDeferred) {
                    asyncDeferred = $q.defer();
                    asyncPromise = asyncDeferred.promise;
                }
                return function asyncDone() {
                    asyncDeferred.resolve();
                };
            };
            scope.$broadcast($modalStack.NOW_CLOSING_EVENT, setIsAsync);
            // Note that it's intentional that asyncPromise might be null.
            // That's when setIsAsync has not been called during the
            // NOW_CLOSING_EVENT broadcast.
            return $q.when(asyncPromise).then(afterAnimating);
            function afterAnimating() {
                if ($animateCss) {
                    $animateCss(domEl, {
                        event: 'leave'
                    }).start().then(function () {
                        domEl.remove();
                    });
                }
                else {
                    $animate.leave(domEl);
                }
                scope.$destroy();
                if (done) {
                    done();
                }
            }
        }
        $document.bind('keydown', function (evt) {
            if (evt.isDefaultPrevented()) {
                return evt;
            }
            var modal = openedWindows.top();
            if (modal && modal.value.keyboard) {
                switch (evt.which) {
                    case 27: {
                        evt.preventDefault();
                        $rootScope.$apply(function () {
                            $modalStack.dismiss(modal.key, 'escape key press');
                        });
                        break;
                    }
                    case 9: {
                        $modalStack.loadFocusElementList(modal);
                        var focusChanged = false;
                        if (evt.shiftKey) {
                            if ($modalStack.isFocusInFirstItem(evt)) {
                                focusChanged = $modalStack.focusLastFocusableElement();
                            }
                        }
                        else {
                            if ($modalStack.isFocusInLastItem(evt)) {
                                focusChanged = $modalStack.focusFirstFocusableElement();
                            }
                        }
                        if (focusChanged) {
                            evt.preventDefault();
                            evt.stopPropagation();
                        }
                        break;
                    }
                }
            }
        });
        $modalStack.open = function (windowInstance, modal) {
            var modalOpener = $document[0].activeElement, modalBodyClass = modal.openedClass || OPENED_MODAL_CLASS;
            toggleTopWindowClass(false);
            openedWindows.add(windowInstance, {
                deferred: modal.deferred,
                renderDeferred: modal.renderDeferred,
                openedDeferred: modal.openedDeferred,
                modalScope: modal.scope,
                title: modal.title,
                modal: modal.modal,
                center: modal.center,
                width: modal.width,
                height: modal.height,
                actions: modal.actions,
                draggable: modal.draggable,
                resizable: modal.resizable,
                maxHeight: modal.maxHeight,
                noMaxHeight: modal.noMaxHeight
            });
            openedClasses.put(modalBodyClass, windowInstance);
            var body = $document.find('body').eq(0);
            var angularDomEl = angular.element('<div uib-modal-window="modal-window"></div>');
            angularDomEl.attr({
                'template-url': modal.windowTemplateUrl,
                'index': openedWindows.length() - 1,
                'animate': 'animate'
            }).html(modal.content);
            if (modal.animation) {
                angularDomEl.attr('modal-animation', 'true');
            }
            var modalDomEl = $compile(angularDomEl)(modal.scope);
            openedWindows.top().value.modalDomEl = modalDomEl;
            openedWindows.top().value.modalOpener = modalOpener;
            body.append(modalDomEl);
            body.addClass(modalBodyClass);
            $modalStack.clearFocusListCache();
        };
        function broadcastClosing(modalWindow, resultOrReason, closing) {
            return !modalWindow.value.modalScope.$broadcast('modal.closing', resultOrReason, closing).defaultPrevented;
        }
        $modalStack.close = function (windowInstance, result) {
            var modalWindow = openedWindows.get(windowInstance);
            if (modalWindow && broadcastClosing(modalWindow, result, true)) {
                modalWindow.value.modalScope.$$uibDestructionScheduled = true;
                modalWindow.value.deferred.resolve(result);
                removeModalWindow(windowInstance, modalWindow.value.modalOpener);
                return true;
            }
            return !modalWindow;
        };
        $modalStack.dismiss = function (windowInstance, reason) {
            var modalWindow = openedWindows.get(windowInstance);
            if (modalWindow && broadcastClosing(modalWindow, reason, false)) {
                modalWindow.value.modalScope.$$uibDestructionScheduled = true;
                modalWindow.value.deferred.reject(reason);
                removeModalWindow(windowInstance, modalWindow.value.modalOpener);
                return true;
            }
            return !modalWindow;
        };
        $modalStack.dismissAll = function (reason) {
            var topModal = this.getTop();
            while (topModal && this.dismiss(topModal.key, reason)) {
                topModal = this.getTop();
            }
        };
        $modalStack.getTop = function () {
            return openedWindows.top();
        };
        $modalStack.modalRendered = function (windowInstance) {
            var modalWindow = openedWindows.get(windowInstance);
            if (modalWindow) {
                modalWindow.value.renderDeferred.resolve();
            }
        };
        $modalStack.focusFirstFocusableElement = function () {
            if (focusableElementList.length > 0) {
                focusableElementList[0].focus();
                return true;
            }
            return false;
        };
        $modalStack.focusLastFocusableElement = function () {
            if (focusableElementList.length > 0) {
                focusableElementList[focusableElementList.length - 1].focus();
                return true;
            }
            return false;
        };
        $modalStack.isFocusInFirstItem = function (evt) {
            if (focusableElementList.length > 0) {
                return (evt.target || evt.srcElement) == focusableElementList[0];
            }
            return false;
        };
        $modalStack.isFocusInLastItem = function (evt) {
            if (focusableElementList.length > 0) {
                return (evt.target || evt.srcElement) == focusableElementList[focusableElementList.length - 1];
            }
            return false;
        };
        $modalStack.clearFocusListCache = function () {
            focusableElementList = [];
            focusIndex = 0;
        };
        $modalStack.loadFocusElementList = function (modalWindow) {
            if (focusableElementList === undefined || !focusableElementList.length) {
                if (modalWindow) {
                    var modalDomE1 = modalWindow.value.modalDomEl;
                    if (modalDomE1 && modalDomE1.length) {
                        focusableElementList = modalDomE1[0].querySelectorAll(tababbleSelector);
                    }
                }
            }
        };
        return $modalStack;
    }])
    .provider('$kWindow', function () {
    var $modalProvider = {
        options: {
            animation: false,
            keyboard: true
        },
        $get: ['$injector', '$rootScope', '$q', '$templateRequest', '$controller', '$uibModalStack',
            function ($injector, $rootScope, $q, $templateRequest, $controller, $modalStack) {
                var $modal = {};
                function getTemplatePromise(options) {
                    return options.template ? $q.when(options.template) :
                        $templateRequest(angular.isFunction(options.templateUrl) ? (options.templateUrl)() : options.templateUrl);
                }
                function getResolvePromises(resolves) {
                    var promisesArr = [];
                    angular.forEach(resolves, function (value) {
                        if (angular.isFunction(value) || angular.isArray(value)) {
                            promisesArr.push($q.when($injector.invoke(value)));
                        }
                        else if (angular.isString(value)) {
                            promisesArr.push($q.when($injector.get(value)));
                        }
                        else {
                            promisesArr.push($q.when(value));
                        }
                    });
                    return promisesArr;
                }
                var promiseChain = null;
                $modal.getPromiseChain = function () {
                    return promiseChain;
                };
                $modal.open = function (modalOptions) {
                    var modalResultDeferred = $q.defer();
                    var modalOpenedDeferred = $q.defer();
                    var modalRenderDeferred = $q.defer();
                    var modalScope = null;
                    //prepare an instance of a modal to be injected into controllers and returned to a caller
                    var windowInstance = {
                        id: $modalStack.length,
                        result: modalResultDeferred.promise,
                        opened: modalOpenedDeferred.promise,
                        rendered: modalRenderDeferred.promise,
                        close: function (result) {
                            return $modalStack.close(windowInstance, result);
                        },
                        dismiss: function (reason) {
                            return $modalStack.dismiss(windowInstance, reason);
                        }
                    };
                    //merge and clean up options
                    modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
                    modalOptions.resolve = modalOptions.resolve || {};
                    //verify options
                    if (!modalOptions.template && !modalOptions.templateUrl) {
                        throw new Error('One of template or templateUrl options is required.');
                    }
                    var templateAndResolvePromise = $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));
                    function resolveWithTemplate() {
                        return templateAndResolvePromise;
                    }
                    // Wait for the resolution of the existing promise chain.
                    // Then switch to our own combined promise dependency (regardless of how the previous modal fared).
                    // Then add to $modalStack and resolve opened.
                    // Finally clean up the chain variable if no subsequent modal has overwritten it.
                    var samePromise;
                    samePromise = promiseChain = $q.all([promiseChain])
                        .then(resolveWithTemplate, resolveWithTemplate)
                        .then(function resolveSuccess(tplAndVars) {
                        modalScope = (modalOptions.scope || $rootScope).$new();
                        modalScope.$close = windowInstance.close;
                        modalScope.$dismiss = windowInstance.dismiss;
                        modalScope.$on('$destroy', function () {
                            if (!modalScope.$$uibDestructionScheduled) {
                                modalScope.$dismiss('$uibUnscheduledDestruction');
                            }
                        });
                        var ctrlInstance, ctrlLocals = {};
                        var resolveIter = 1;
                        //controllers
                        if (modalOptions.controller) {
                            ctrlLocals.$scope = modalScope;
                            ctrlLocals.$windowInstance = windowInstance;
                            angular.forEach(modalOptions.resolve, function (value, key) {
                                ctrlLocals[key] = tplAndVars[resolveIter++];
                            });
                            ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
                            if (modalOptions.controllerAs) {
                                if (modalOptions.bindToController) {
                                    angular.extend(ctrlInstance, modalScope);
                                }
                                modalScope[modalOptions.controllerAs] = ctrlInstance;
                            }
                        }
                        $modalStack.open(windowInstance, {
                            scope: modalScope,
                            deferred: modalResultDeferred,
                            openedDeferred: modalOpenedDeferred,
                            renderDeferred: modalRenderDeferred,
                            content: tplAndVars[0],
                            title: modalOptions.title,
                            modal: modalOptions.modal,
                            center: modalOptions.center,
                            width: modalOptions.width,
                            height: modalOptions.height,
                            actions: modalOptions.actions,
                            draggable: modalOptions.draggable,
                            resizable: modalOptions.resizable,
                            maxHeight: modalOptions.maxHeight,
                            noMaxHeight: modalOptions.noMaxHeight
                        });
                    }, function resolveError(reason) {
                        modalOpenedDeferred.reject(reason);
                        modalResultDeferred.reject(reason);
                    })
                        .finally(function () {
                        if (promiseChain === samePromise) {
                            promiseChain = null;
                        }
                    });
                    return windowInstance;
                };
                return $modal;
            }
        ]
    };
    return $modalProvider;
});
