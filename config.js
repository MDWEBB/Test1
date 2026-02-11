
var config = {
  address: "0.0.0.0",
  port: 8080,
  basePath: "/",
  ipWhitelist: [],
  language: "en",
  locale: "en-US",
  logLevel: ["INFO", "LOG", "WARN", "ERROR"],
  timeFormat: 24,
  units: "metric",
  useHttps: false,

  modules: [
    {
      module: "MMM-ModulePosition",
      position: "fullscreen_below",
      disabled: true
    },
    {
      module: "updatenotification",
      position: "top_bar",
      disabled: true
    },
    {
      module: "clock",
      position: "top_left",
      // classes: "Monitor",
      config: {
        displayType: "digital",
        timeFormat: 24,
        displaySeconds: true,
        showDate: true,
        dateFormat: "dddd, LL"
      }
    },
    {
      module: "MMM-CountDown",
      position: "top_left",
      // classes: "Monitor",
      config: {
        event: "Hugo's First Day of Kinder",
        date: "2026-02-04",
        daysLabel: "days "
      }
    },
    {
      module: "MMM-CountDown",
      position: "top_left",
      // classes: "Monitor",
      config: {
        event: "Hugo's Birthday",
        date: "2026-02-13",
        daysLabel: "days "
      }
    },
    {
      module: "MMM-ImagesPhotos",
      position: "top_center",
      // classes: "Monitor",
      config: {
        animationSpeed: 1000,
        updateInterval: 45000,
        maxHeight: "500px",
        maxWidth: "500px",
        path: ""
      }
    },
   /* {
        module: "MMM-OpenWeatherMapForecast",
        header: "Weather",
        position: "top_right",
        classes: "default everyone",
        config: {
          apikey: "cfb4187b9743b212915c5438d685f778",
          latitude: "-38.314560",
          longitude: "146.419373",
          iconset: "4c",
          concise: false,
          forecastLayout: "table",
          maxDailiesToShow: 5,
          showWind: false,
          units: "metric",
          language: "en",
          showExtraCurrentConditions: false,
          showHourlyForecast: false,
          forecastHeaderText: "",
          showSummary: false
        }},
    {
      module: "MMM-Config",
      position: "top_right",
      // classes: "Monitor",
      config: {
        restart: "none"
      }
    },*/
    {
      module: "MMM-GoogleSheets",
     //header: "General Info", // Added header to see it on screen
      position: "top_left",
      config: {
        // This must be the URL for the General spreadsheet
        url: "https://script.google.com/macros/s/AKfycbxeBHV-KR_WKz3NcOxLzXTWBLou5bEaLt1xOzMPoECgUSGLlcSBmWfSuJfA94DPD2C7/exec",
        sheet: "MagicMirror ", // Keep the space if that's the tab name
        range: "A1:B6",
        updateInterval: 3600000
      }
    },
    

   {
      module: "MMM-OpenWeatherMapForecast",
      header: "Weather",
      position: "top_right",
      classes: "default everyone",
      config: {
        apikey: "cfb4187b9743b212915c5438d685f778",
        latitude: "-38.314560",
        longitude: "146.419373",
        iconset: "4c",
        concise: false,
        forecastLayout: "table",
        showHourlyForecast: false, // Disables the hourly breakdown
        maxDailiesToShow: 5,        // Shows 7 days of daily forecast
        showWind: false,
        units: "metric",
        language: "en",
        showExtraCurrentConditions: false,
        forecastHeaderText: "",
        showSummary: false
      }
    },{
      module: "MMM-GoogleSheets",
      //header: "Weekly Meal Plan", // Added header to see it on screen
      position: "top_right",
      config: {
        // This must be the URL for the Meal Plan spreadsheet
        url: "https://script.google.com/macros/s/AKfycbw9IZtyceF0jWyGzBgdiVAuq2rS-mHCGBYU7CdU7rN8_u6gVHVapgjXS_8EVLfal7m0/exec",
        sheet: "Meal Plan",
        range: "B2:C8",
        updateInterval: 3600000
      }
    },
    {
      module: "MMM-CalendarExt3",
      position: "bottom_bar",
disabled: false,
      title: "",
      config: {
        instanceId: "basicCalendar",
        locale: "en-AU",           // Changed to AU for local date formats
        mode: "week",              // Key change for rolling view
        weekIndex: 0,              // Starts the view at the current week
        weeksInView: 4,            // Shows 4 weeks from the start index
        maxEventLines: 6,
        firstDayOfWeek: 0,         // 0 is Sunday, 1 is Monday
        eventHeight: "15px",
        useMarquee: true,
        refreshInterval: 100000,
        eventTransformer: (ev) => {
          if (ev.title.search('DINNER') > -1) ev.symbol = ['fluent-color:food-28']
          if (ev.title.search('Arnold') > -1) ev.symbol = ['fluent-emoji-flat:dog']
          if (ev.title.search('Gus') > -1) ev.symbol = ['fluent-emoji-flat:dog']
          if (ev.title.search('Dogs') > -1) ev.symbol = ['fluent-emoji-flat:dog']
          if (ev.title.search('dogs') > -1) ev.symbol = ['fluent-emoji-flat:dog']
          if (ev.title.search('Marcus') > -1) ev.symbol = ['noto:pretzel']
          if (ev.title.search('Pretzel') > -1) ev.symbol = ['noto:pretzel']
          if (ev.title.search('Recycle Bin') > -1) ev.symbol = ['game-icons:soda-bottle']
          if (ev.title.search('Green Waste bins') > -1) ev.symbol = ['streamline-emojis:leaf-fluttering-in-wind']
          if (ev.title.search('Cleaning Day') > -1) ev.symbol = ['openmoji:broom']
          if (ev.title.search('Swimming') > -1) ev.symbol = ['fxemoji:swimming']
          if (ev.title.search('Phils') > -1) ev.symbol = ['twemoji:baby-angel-light-skin-tone']
          if (ev.title.search('Phyllis') > -1) ev.symbol = ['twemoji:baby-angel-light-skin-tone']
          if (ev.title.search('Birthday') > -1) ev.symbol = ['emojione:birthday-cake']
          if (ev.title.search('birthday') > -1) ev.symbol = ['emojione:birthday-cake']
          if (ev.title.search('Hugo') > -1) ev.symbol = ['cryptocurrency-color:hight']
          if (ev.title.search('Maggie') > -1) ev.symbol = ['cryptocurrency-color:xmy']
          if (ev.title.search('Lucas') > -1) ev.symbol = ['openmoji:man-judge-light-skin-tone']
          if (ev.title.search('Hudge') > -1) ev.symbol = ['twemoji:gemini']
          if (ev.title.search('Danielle') > -1) ev.symbol = ['twemoji:gemini']
          if (ev.title.search('Factory') > -1) ev.symbol = ['emojione-v1:cow']
          if (ev.title.search('factory') > -1) ev.symbol = ['emojione-v1:cow']
          if (ev.title.search('Zala') > -1) ev.symbol = ['cryptocurrency-color:zec']
          if (ev.title.search('Tabari') > -1) ev.symbol = ['cryptocurrency-color:usdt']
          return ev
        }

      }
    },{
        module: "calendar",
        order: "*",
        animateIn: "None",
        animateOut: "None",
        index: 0,
        label: "instance 1",
        config: {
          maximumEntries: 10,
          maximumNumberOfDays: 365,
          limitDays: 0,
          pastDaysCount: 0,
          displaySymbol: true,
          defaultSymbol: "calendar-alt",
          defaultSymbolClassName: "fas fa-fw fa-",
          maxTitleLength: 25,
          maxLocationTitleLength: 25,
          maxTitleLines: 3,
          maxEventTitleLines: 3,
          fetchInterval: 600000,
          animationSpeed: 2000,
          fade: true,
          fadePoint: 0.25,
          urgency: 7,
          timeFormat: "relative",
          dateFormat: "MMM Do",
          dateEndFormat: "LT",
          fullDayEventDateFormat: "MMM Do",
          getRelative: 6,
          hideDuplicates: true,
          tableClass: "small",
          calendars: [
            {
              symbol: "calendar-alt",
              url: "https://calendar.google.com/calendar/ical/4efbedad2784375c01feb3efdfc3af1c952bc6855f277cc0ff676a776cb246a2%40group.calendar.google.com/private-1a35a8867b2c1f528e0f8ac9f9fa15ab/basic.ics"
            }
          ],
          customEvents: [
            {
              keyword: ".*",
              transform: {
                search: "De verjaardag van "
              }
            },
            {
              keyword: ".*",
              transform: {
                search: "'s birthday"
              }
            }
          ],
          locationTitleReplace: {
            "street ": ""
          },
          broadcastEvents: true,
          broadcastPastEvents: true,
          updateOnFetch: true,
          showLocation: false,
          displayRepeatingCountTitle: false,
          wrapEvents: false,
          wrapLocationEvents: false,
          showEnd: false,
          showEndsOnlyWithDuration: false,
          hidePrivate: false,
          hideOngoing: false,
          hideTime: false,
          showTimeToday: false,
          colored: false,
          forceUseCurrentTime: false,
          sliceMultiDayEvents: false,
          nextDaysRelative: false,
          selfSignedCert: false,
          coloredText: false,
          coloredBorder: false,
          coloredSymbol: false,
          coloredBackground: false,
          limitDaysNeverSkip: false,
          flipDateHeaderTitle: false,
          excludedEvents: []
        },
        disabled: false
      },
    {
      module: "alert",
      config: {
        welcome_message: false
      }
    },
    
    /* {
      module: 'MMM-pages',
      config: {
        modules: [
          ["Monitor"], // Page 0
          ["Tablet"] // Page 1
        ],
        fixed: ["MMM-Remote-Control", "alert"],
        rotationTime: 0, 
      }
    }, 
    */
    {
      module: "MMM-Remote-Control",
disabled: true,
      config: {
        apiKey: "88d9ec2a2892411d9ec7c32cd41ea787"
      }

    },
      
  ]
};

if (typeof module !== "undefined") { module.exports = config; }
/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") {module.exports = config;}
