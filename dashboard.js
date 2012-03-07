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
    var options = $.extend({}, defaults, options);
    var init = false;
    var el = $(options.el);
    
    var dashboard = {
        testWidth: {},
        progress: {},
        run: function () {
            this.runStandardInfoCycle();
            this.runProcessorInfoCycle();
        },
        addTimestampToBuild : function(elements){
            elements.each(function() {
                var worker = $(this).attr("class");
                var y = parseInt($(this).offset().top + $(this).height() / 2);
                var x = parseInt($(this).offset().left + $(this).width() / 2);
                var id = x + "-" + y;
                var html = '<div class="job_disabled_or_aborted" id="' + id + '">' + worker + '</div>';
                el.append(html);
                var new_element = $("#" + id);
                new_element.css("top", parseInt(y - new_element.height() / 2)).css("left", parseInt(x - new_element.width() / 2));
                new_element.addClass('rotate');
                $(this).addClass('workon');
            });
        },
        composeHtmlFragement: function(jobs){
            var fragment = "<section>";
            $.each(jobs, function(){
                if((options.showOnlyJobs.length ==0 || $.inArray(this.name, options.showOnlyJobs) != -1) && ($.inArray(this.name, options.hideJobs) == -1)){
                    style="";
                    if (dashboard.progress[this.name]) {          
                        style = "background: -webkit-linear-gradient(left, #3861b6 0%,#3861b6 " + dashboard.progress[this.name] + "%,#909CB5 " + (dashboard.progress[this.name] + 1) + "%,#909CB5 100%);";
                    };
                    id = this.name.replace(/ /g,'');
                    if (dashboard.testWidth[id]) {
                        style += "width: " + dashboard.testWidth[id] + "px;";
                    }
                    failedDots = '';
                    if (buildInfo[this.name] && buildInfo[this.name].previouslyFailedTests > 0) {
                        var dots = '';                  
                        for (var i = 0; i < buildInfo[this.name].previouslyFailedTests; i++) {
                            dots += '<div class="dot"></div>';
                        }
                        failedDots = "<div class=\"failedDots\">" + dots +  "</div>";
                    }
                    fragment += ("<article id =\"" + id + "\" class=" + this.color + " style=\"" + style + "\"><head>" + this.name + "</head>" + failedDots +  "</article>");
                }
            });
            dashboardLastUpdatedTime = new Date();
            fragment +="<div class='time'>" + (new Date()).toString('dd, MMMM ,yyyy')  + "</div></section>";
            el.html(fragment);
            this.initSizes();
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
                    url: options.jenkinsUrl + options.view + "/api/json?format=json&jsonp=?&tree=jobs[name,color,url,lastBuild[number,result],lastStableBuild[number,result]]",
                    dataType: "jsonp",
                    // callbackParameter: "jsonp",
                    timeout: 10000,
                    success: function(data, status){
                        $.unblockUI();
                        $.each(data.jobs, function() {
                            name = this.name.split(' #', 1)[0];
                            if (!buildInfo[name]) {buildInfo[name] = {};}
                            buildInfo[name].number = this.lastBuild.number;
                            buildInfo[name].result = this.lastBuild.result;
                            buildInfo[name].previouslyFailedTests = this.lastBuild.number - this.lastStableBuild.number - 1;
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
                            $.each(data.computer[0].executors, function() {
                                if (!this.idle) {
                                    name = this.currentExecutable.fullDisplayName.split(' #', 1)[0];
                                    dashboard.progress[name] = this.progress;
                                }
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
            if ($("html").height() > $(window).height()) { 
                el.css('font-size', parseInt($('body').css('font-size'))-1); 
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
