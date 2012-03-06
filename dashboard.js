/*
 * Configuration
 */

//the ci address()
config = {
    jenkinsViewUrl: "http://ci.jruby.org/view/Ruboto",
    showOnlyJobs: [], // jobs to be shown, if [] all jobs of the view are shown
    hideJobs: [], // jobs to be excluded
    updateInterval: 4000 // in milliseconds
    el: body // the element where the dashboar shall be rendered
}


//var ci_url = "http://ci.jruby.org/view/Ruboto";
//var jobs_to_be_filtered = []; // leave empty, for all jobs
//var jobs_to_be_excluded = ["some-job"];
var dashboardLastUpdatedTime = new Date(); 
//var updateInterval = 4000; //updating every x milliseconds 

jenkinsDashboard = function (options) {
    var buildInfo;
    var defaults = {
        showOnlyJobs: [], // jobs to be shown, if [] all jobs of the view are shown
        hideJobs: [], // jobs to be excluded
        updateInterval: 4000 // in milliseconds
        el: body
    }
    
    var dashboard = {
        run: function () {
            base = this;
            this.runStandardInfoCycle();
            this.runProcessorInfoCycle();
            console.log(base);
        },
        addTimestampToBuild : function(elements){
            elements.each(function() {
                var worker = $(this).attr("class");
                var y = parseInt($(this).offset().top + $(this).height() / 2);
                var x = parseInt($(this).offset().left + $(this).width() / 2);
                var id = x + "-" + y;
                var html = '<div class="job_disabled_or_aborted" id="' + id + '">' + worker + '</div>';
                $("#content").append(html);
                var new_element = $("#" + id);
                new_element.css("top", parseInt(y - new_element.height() / 2)).css("left", parseInt(x - new_element.width() / 2));
                new_element.addClass('rotate');
                $(this).addClass('workon');
            });
        },
        composeHtmlFragement: function(jobs){
            var fragment = document.createDocumentFragment();
            var fragment = "<section>";
            $.each(jobs, function(){
                if((jobs_to_be_filtered.length ==0 || $.inArray(this.name, jobs_to_be_filtered) != -1) && ($.inArray(this.name, jobs_to_be_excluded) == -1)){
                    fragment += ("<article class=" + this.color + "><head>" + this.name + "</head></article>");
                }
            });
            dashboardLastUpdatedTime = new Date();
            fragment +="<article class='time'>" + dashboardLastUpdatedTime.toString('dd, MMMM ,yyyy')  + "</article></section>";
            $("#content").html(fragment);
        },
        updateBuildStatus : function(data) {
            dashboard.composeHtmlFragement(data.jobs);
            dashboard.addTimestampToBuild($(".disabled, .aborted"));     
        },
        
        runStandardInfoCycle: function() {
            var counter = 0;
            counter++;
            $.jsonp({
                url: ci_url + "/api/json?format=json&jsonp=?&tree=jobs[name,color,url,lastBuild[number,result],lastStableBuild[number,result]]",
                dataType: "jsonp",
                // callbackParameter: "jsonp",
                timeout: 10000,
                beforeSend: function(xhr) {
                    if(counter == 1){
                        $.blockUI({ message: '<h1 id="loading"><img src="busy.gif" />loading.....</h1>' });
                    };
                },
                success: function(data, status){
                    $.unblockUI();
                    //lastData=soundForCI(data,lastData);
                    $.each(data.jobs, function() {
                        name = this.name.split(' #', 1)[0];
                        buildInfo[name].number = this.lastBuild.number;
                        buildInfo[name].result = this.lastBuild.result;
                        buildInfo[name].previouslyFailedTests = this.lastBuild.number - this.lastStableBuild.number - 1;
                    });
                    dashboard.updateBuildStatus(data);
                },
                error: function(XHR, textStatus, errorThrown){
                    if($("#error_loading").length <= 0){
                        $.blockUI({message: '<h1 id="error_loading"> Ooooops, check out your network etc. Retrying........</h1>'});
                    }
                }
            });
        },
        
        runProcessorInfoCycle: function () {
            console.log(base);
        }
    };
    return dashboard;
};



$(document).ready(function(){
    
    db = new jenkinsDashboard(options);

    
    //ci_url = ci_url + "/api/json";
    var counter = 0;
    var auto_refresh = setInterval(function(){
        counter++;
        $.jsonp({
            url: ci_url + "/api/json?format=json&jsonp=?",
            dataType: "jsonp",
            // callbackParameter: "jsonp",
            timeout: 10000,
            beforeSend: function(xhr) {
                if(counter == 1){
                    $.blockUI({ message: '<h1 id="loading"><img src="busy.gif" />loading.....</h1>' });
                };
            },
            success: function(data, status){
                $.unblockUI();
                jenkinsDashboard.updateBuildStatus(data);
            },
            error: function(XHR, textStatus, errorThrown){
                if($("#error_loading").length <= 0){
                    $.blockUI({message: '<h1 id="error_loading"> Ooooops, check out your network etc. Retrying........</h1>'});	
                }
            }
        });
    }, updateInterval);
})