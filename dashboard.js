/*
 * Configuration
 */

//the ci address()

 

jenkinsDashboard = function (options) {
    var buildInfo = {};
    var defaults = {
        showOnlyJobs: [], // jobs to be shown, if [] all jobs of the view are shown
        hideJobs: [], // jobs to be excluded
        updateInterval: 4000, // in milliseconds
        el: document.body
    };
    var buildOptionsDefaults = {
        'ageWarning' : 3600,
        'ageError' : 3600 * 3
    };
    var options = $.extend({}, defaults, options);
    var init = false;
    var el = $(options.el);
    var innerEl, outerEl;
    
    var dashboard = {
        testWidth: {},
        progress: {},
        greenBuild: false,
        builds: {},
        run: function () {
            this.initializeElements();
            this.runStandardInfoCycle();
            this.runProcessorInfoCycle();
        },
        
        initializeElements: function () {
            if (options.el == document.body) {
                el = $('<div></div>').css('overflow','visible').css('width', $('body').width()).css('height', $(window).height() - parseInt($('body').css('padding-top')) - parseInt($('body').css('padding-bottom')));
                $(document.body).html(el);
            }
            outerEl = el;
        },
        
        addTimestampToBuild : function(elements) {
            elements.each(function() {
                var worker = $(this).attr("class");
                var y = parseInt($(this).offset().top + $(this).height() / 2);
                var x = parseInt($(this).offset().left + $(this).width() / 2);
                var id = x + "-" + y;
                var html = '<div class="job_disabled_or_aborted" id="' + id + '">' + worker + '</div>';
                el.append(html);
                var new_element = $("#" + id);
                new_element.css("top", parseInt(y - new_element.height() / 2 +10)).css("left", parseInt(x - new_element.width() / 2));
                new_element.addClass('rotate');
                $(this).addClass('workon');
            });
        },
        composeHtmlFragement: function(jobs){
            var fragment = "<section>";
            var warning, warning_info, warnings, failedDots, results, dots, buildOptions, greenBuild;
            greenBuild = true;
            $.each(jobs, function(){
                if((options.showOnlyJobs.length == 0 || $.inArray(this.name, options.showOnlyJobs) != -1) && ($.inArray(this.name, options.hideJobs) == -1)){
                    style="", warning = "", warning_info = "", warnings = [],failedDots = '',results = '',dots = '';
                    buildOptions = $.extend({}, buildOptionsDefaults, options.buildOptions.__default__, options.buildOptions[this.name]);
                    if (this.buildable && !(this.lastStableBuild && this.lastBuild && this.lastBuild.number == this.lastStableBuild.number)) {
                        greenBuild = false;
                        console.log('failed: ',this.name , this);
                    }
                    if (dashboard.progress[this.name]) {          
                        style = "background: -webkit-linear-gradient(left, #3861b6 0%,#3861b6 " + dashboard.progress[this.name] + "%,#909CB5 " + (dashboard.progress[this.name] + 1) + "%,#909CB5 100%);";
                    };
                    id = this.name.replace(/ /g,'');
                    if (dashboard.testWidth[id]) {
                        style += "width: " + dashboard.testWidth[id] + "px;";
                    }
                    if (this.buildable && buildInfo[this.name] && buildInfo[this.name].previouslyFailedTests > 0) {
                        for (var i = 0; i < Math.min(buildInfo[this.name].previouslyFailedTests,100); i++) {
                            dots += '<div class="dot"></div>';
                        }
                        failedDots = "<div class=\"failedDots\">" + dots +  "</div>";
                        if (buildInfo[this.name].previouslyFailedTests > buildOptions.buildFailWarning) {
                            warnings[warnings.length] = buildInfo[this.name].previouslyFailedTests + ' failed tests in a row';
                        }
                    }
                    if (this.buildable && buildInfo[this.name].age > buildOptions.ageWarning) {
                        warnings[warnings.length] = 'no build for ' + Math.round(buildInfo[this.name].age / 3600) + ' hours';
                    }
                    if (this.buildable && warnings.length > 0) {
                        warning_info = '<div class="warning_info"><div>' + warnings.join(', ') + '</div></div>';
                    }
                    if (this.buildable && (buildInfo[this.name].previouslyFailedTests > buildOptions.buildFailError || buildInfo[this.name].age > buildOptions.ageError)) {
                        warning = '<div class="warning"></div>';
                    }
                    if (this.buildable && buildInfo[this.name].testResults) {
                        results = '<div class="info">' + buildInfo[this.name].testResults.failed + '/' + buildInfo[this.name].testResults.total + '</div>';
                    }
                    fragment += ("<article id =\"" + id + "\" class=" + this.color + " style=\"" + style + "\"><head>" + this.name + "</head>" + failedDots + warning_info + warning + results +"</article>");
                }
            });
            
            dashboardLastUpdatedTime = new Date();
            fragment +="<div class='time'>" + (new Date()).toString('dd, MMMM ,yyyy')  + "</div></section>";
            el.html(fragment);
            el.addClass('container');
            innerEl = el.find('section').first();
            this.initSizes();
            if (!dashboard.greenBuild && greenBuild) {
                dashboard.greenBuild = true;
                console.log('new green build');
                console.log($('body'));
                if (options.drogenlied) {
                    el.after($('<div id="drogenlied"><iframe style="width: 100%; height: 100%;" src="drogenlied.html"></iframe><div><p>Komplett grüner Build!!</p></div></div>'));
                    setTimeout(function() { $('#drogenlied').slideUp('slow', function() {$('#drogenlied').remove()})}, 45000);
                }
            } else if (greenBuild) {
                console.log('green build');
            } else {
                dashboard.greenBuild = false;
                console.log('red build');
            }
        },
        updateBuildStatus : function(data) {
            dashboard.composeHtmlFragement(data.jobs);
            dashboard.addTimestampToBuild($(".disabled, .aborted"));     
        },
        
        runStandardInfoCycle: function() {
            var counter = 0;
            counter++;
            setInterval(function(){
                $.jsonp({
                    url: options.jenkinsUrl + options.view + "/api/json?format=json&jsonp=?&tree=jobs[name,color,url,buildable,inQueue,lastBuild[number,result,timestamp],lastStableBuild[number,result],lastCompletedBuild[actions[failCount,skipCount,totalCount]]]",
                    dataType: "jsonp",
                    // callbackParameter: "jsonp",
                    timeout: 10000,
                    success: function(data, status){
                        $.unblockUI();
                        $.each(data.jobs, function() {
                            name = this.name.split(' #', 1)[0];
                            if (!buildInfo[name]) {buildInfo[name] = {};}
                            if (this.lastBuild) {
                                buildInfo[name].number = this.lastBuild.number;
                                buildInfo[name].result = this.lastBuild.result;
                                buildInfo[name].age = Math.floor((new Date() - new Date(this.lastBuild.timestamp)) / 1000);
                                buildInfo[name].previouslyFailedTests = (this.lastBuild.number || 0) - (this.lastStableBuild ? this.lastStableBuild.number : 0) - 1;
                            }
                            delete buildInfo[name].testResults;
                            if (this.lastCompletedBuild) {
                                for (i=0; i < this.lastCompletedBuild.actions.length; i++) {
                                    if (this.lastCompletedBuild.actions[i].failCount) {
                                        buildInfo[name].testResults = {
                                            total: this.lastCompletedBuild.actions[i].totalCount,
                                            failed: this.lastCompletedBuild.actions[i].failCount,
                                            skipped: this.lastCompletedBuild.actions[i].skippedCount
                                        }
                                    }
                                }
                            }
                        });
                        dashboard.updateBuildStatus(data);
                    },
                    error: function(XHR, textStatus, errorThrown){
                    }
                });
            }, options.updateInterval);
        },
        
        runProcessorInfoCycle: function () {
            setInterval(function(){
                $.jsonp({
                    url: options.jenkinsUrl + "/computer/api/json?format=json&jsonp=?&depth=2",
                    dataType: "jsonp",
                    timeout: 10000,
                    success: function(data, status){
                        dashboard.progress = {};
                        if (!data.idle) {
                            $.each(data.computer, function() {
                                $.each(this.executors, function() {
                                    if (!this.idle) {
                                        name = this.currentExecutable.fullDisplayName.split(' #', 1)[0];
                                        dashboard.progress[name] = this.progress;
                                    }
                                });
                            });
                        }
                    },
                    error: function(XHR, textStatus, errorThrown){
                        if($("#error_loading").length <= 0){
                            $.blockUI({message: '<h1 id="error_loading"> Ooooops, check out your network etc. Retrying........</h1>'}); 
                        }
                    }
                });
            }, options.updateInterval);
        },

        initSizes: function () {
            if (init) return;
            if (innerEl.height() > outerEl.height()) { 
                el.css('font-size', parseInt(el.css('font-size'))-1); 
                setTimeout(dashboard.initSizes, 15);
            } else {
                init = true;
                dashboard.updateWidth();
            }
        },

        updateWidth: function () {
            dashboard.testWidth = dashboard.testWidth || {};
            var viewportWidth = $('section').width();
            var tests = $('section article');
            var rowWidth = 0;
            var currentTest = 0;
            var rowItems = []
            for (currentTest = 0; currentTest < tests.length; currentTest++) {
                if ((rowWidth + tests.eq(currentTest).outerWidth(true)) < viewportWidth) {
                    rowItems.push(tests.eq(currentTest));
                    rowWidth = rowWidth + tests.eq(currentTest).outerWidth(true);
                } else {
                    leftSpace = viewportWidth - rowWidth;
                    space = Math.floor(leftSpace / rowItems.length);
                    for (var x=0; x<rowItems.length; x++) {
                        dashboard.testWidth[rowItems[x].attr('id')] = rowItems[x].width() + space;
                    }
                    rowItems = [];
                    rowItems.push(tests.eq(currentTest));
                    rowWidth=tests.eq(currentTest).outerWidth(true);
                }
            }
        }
    };
    dashboard.run();
    return dashboard;
};
