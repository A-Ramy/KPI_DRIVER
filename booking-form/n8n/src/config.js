// ===== Settings for all three KPI DRIVER workflows (pasted at the top of each "Validate" node) =====
const LOCATION_ID = 'nLOdLoui5CvpzktszMJx';      // KPI DRIVER sub-account (read from the live HighLevel forms)
const CALENDAR_ID = '17jl7cP7dvOAU48s6C3L';      // the ONE discovery calendar. Default: the current header calendar.
const DURATION_MIN = 45;                          // must match the calendar's slot length
const CONTACT_SOURCE = 'SEO';                     // HighLevel contact "source", as the old forms set it
// Custom fields the website may write (HighLevel custom field ids). Anything else in a request is ignored.
const BOOKING_FIELDS = ['st1eCAFAHDcgPM4VvtNn', 'Z8TSBkLl0c3nkOh0d0bj', 'h4JApkD7A1meEgqfLJ4v', 'zntmhqZEVR510izM1Amv',
  'ARe4MceHNpyuA2cKkIEw', 'qmkmAZyHzfeRFjkRKQaw', 'UWxeByWt7W4EuIVVAQsm', 'J1MTiekQt4vbamz8JFee', 'u6f3OtUsag2gUpFKEHCy',
  'TgvNUU7bOSq4YSB2FS9w', 'xOz64JUSqg9hFWthmar5', 'QfNSOY8w6fJUpyxW9al1', '9aMGEJzyATDb4ZGnPLt7', 'rihpUXcXicHdCxEo4CfX',
  'sqX5fTAKqUuNRwdoxaag', 'uclYhjBFIyedqd8xqYwE', 'VLoxJWATbFZMgMOfBb4P', 'kjvFHgnOa8iVNV7YiiBN', 'LNdrE1FEgFjbPydSCntV',
  'FohJiIh9tGFKXI02LSUD', 'crnTGUSW3StY8VTOqaR2', 'EI2ls6K7uJFe75PmRPaX', 'U26ojrxlzQxC1kwAMvki', 'O5yyMN7TXsWzblxrHUfO'];
const CONTACT_FIELDS = ['st1eCAFAHDcgPM4VvtNn', 'zntmhqZEVR510izM1Amv', '2qGuyylBHmeIFy4ZQITo', 'O5yyMN7TXsWzblxrHUfO'];
// ===== end of settings =====
