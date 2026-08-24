(function setupTranslations() {
  const translations = {
    en: {
      'language.en': 'English',
      'language.km': 'ខ្មែរ',
      'how.title': 'How to Play',
      'how.open': '❔ How to Play',
      'how.close': 'Got it',
      'how.intro': 'Race together, stay safe, and have fun!',
      'how.join': 'Join with your name and province. You will be placed on a team of 4–5.',
      'how.complete': 'Complete challenges together and upload the required photo or video.',
      'how.review': 'The organizer reviews every upload. Only approved submissions earn points.',
      'how.retry': 'If an upload is rejected, you will see the reason and can submit a new attempt.',
      'how.timer': 'The race lasts exactly three hours after the organizer presses Start Hunt.',
      'how.safety': 'Stay with your team, respect people and places, follow local laws, and never take unsafe risks.',
      'hero.tagline': 'Join your team. Explore the city. Climb the leaderboard.',
      'join.title': 'Join the Hunt',
      'join.intro': 'Enter your name and select your province. We’ll automatically place you on a team of 4–5.',
      'join.name': 'Your name',
      'join.namePlaceholder': 'e.g. Andrew',
      'join.province': 'Province / municipality',
      'join.selectProvince': 'Select your province',
      'join.button': 'Find My Team',
      'join.missing': 'Please enter your name and select your province.',
      'join.finding': 'Finding your team…',
      'team.your': 'YOUR TEAM',
      'team.settings': '⚙️ Team Settings',
      'team.customize': 'Customize your team',
      'team.name': 'Team name',
      'team.chooseIcon': 'Choose an icon',
      'team.chooseColor': 'Choose a color',
      'team.save': 'Save Team',
      'team.saving': 'Saving…',
      'timer.label': 'HUNT TIMER',
      'timer.waitingStatus': 'Waiting to start',
      'timer.waiting': 'Waiting for organizer to start the hunt',
      'timer.live': 'Hunt is live',
      'timer.go': 'Go, go, go!',
      'timer.finished': 'Hunt finished',
      'timer.timesUp': "Time’s up!",
      'timer.final': "Time’s up! Check the final leaderboard.",
      'sync.updated': 'Live · updated just now',
      'sync.refresh': 'Refresh',
      'sync.failed': 'Live update paused — tap Refresh',
      'tabs.challenges': 'Challenges',
      'tabs.leaderboard': 'Leaderboard',
      'tabs.feed': 'Feed',
      'progress.approved': '{approved} of {total} challenges approved',
      'challenge.heading': 'Challenges',
      'challenge.approved': 'Approved — points added 🎉',
      'challenge.pending': 'Submitted — awaiting organizer review ⏳',
      'challenge.rejected': 'Not approved — {reason}. Your team can try again.',
      'challenge.retry': 'Submit a new attempt',
      'challenge.complete': 'Complete Challenge',
      'challenge.closed': 'The race has ended.',
      'challenge.photo': 'photo',
      'challenge.video': 'video',
      'category.city': 'city',
      'category.people': 'people',
      'category.adventure': 'adventure',
      'category.temple': 'temple',
      'category.landmark': 'landmark',
      'category.creative': 'creative',
      'category.food': 'food',
      'points.base': '{points} pts',
      'points.bonus': '{points} pts + bonus',
      'points.each': '{points} pts each',
      'leaderboard.heading': 'Live Leaderboard',
      'leaderboard.empty': 'No scores yet.',
      'leaderboard.details': '{challenges} challenges · {members} members',
      'feed.heading': 'Community Feed',
      'feed.empty': 'Approved submissions will appear here.',
      'feed.completed': '{team} completed {challenge}',
      'upload.eyebrow': 'COMPLETE CHALLENGE',
      'upload.media': 'Photo / video',
      'upload.submit': 'Submit Challenge',
      'upload.submitting': 'Submitting…',
      'upload.choose': 'Please choose a photo or video.',
      'upload.tooLarge': 'File is too large. Choose one under 12 MB.',
      'upload.unsupported': 'Please choose a supported photo or video.',
      'upload.requires': 'This challenge requires a {kind}.',
      'upload.bonusRange': 'Bonus units must be from 0 to {max}.',
      'upload.bonusUnits': 'Bonus units',
      'upload.bonusHint': '+{points} points each · maximum {max}',
      'upload.preparing': 'Preparing file… {percent}%',
      'upload.uploading': 'Uploading securely… Keep this page open.',
      'upload.review': 'Upload complete — sent for organizer review.',
      'upload.failed': 'Upload failed. Check your connection and try again. {detail}',
      'connection.offline': 'You are offline. Keep this page open and reconnect before uploading.',
      'connection.online': 'You’re back online.',
      'reason.unclear': 'the photo or video is unclear',
      'reason.wrong_challenge': 'the evidence is for the wrong location or challenge',
      'reason.missing_people': 'required team members are missing',
      'reason.requirements': 'the challenge requirements were not met',
      'reason.other_retry': 'please redo the challenge and upload a clearer attempt',
    },
    km: {
      'language.en': 'English',
      'language.km': 'ខ្មែរ',
      'how.title': 'របៀបលេង',
      'how.open': '❔ របៀបលេង',
      'how.close': 'យល់ហើយ',
      'how.intro': 'ប្រកួតជាក្រុម រក្សាសុវត្ថិភាព និងរីករាយជាមួយគ្នា!',
      'how.join': 'ចូលរួមដោយបញ្ចូលឈ្មោះ និងជ្រើសរើសរាជធានី/ខេត្ត។ អ្នកនឹងត្រូវដាក់ក្នុងក្រុមដែលមានសមាជិក ៤–៥ នាក់។',
      'how.complete': 'បំពេញបេសកកម្មជាក្រុម ហើយបង្ហោះរូបថត ឬវីដេអូតាមការកំណត់។',
      'how.review': 'អ្នករៀបចំនឹងពិនិត្យរាល់ការបង្ហោះ។ មានតែការដាក់ស្នើដែលបានអនុម័តប៉ុណ្ណោះដែលទទួលបានពិន្ទុ។',
      'how.retry': 'បើការបង្ហោះត្រូវបានបដិសេធ អ្នកនឹងឃើញមូលហេតុ ហើយអាចដាក់ស្នើម្តងទៀត។',
      'how.timer': 'ការប្រកួតមានរយៈពេល ៣ ម៉ោងគត់ បន្ទាប់ពីអ្នករៀបចំចុចចាប់ផ្តើម។',
      'how.safety': 'នៅជាមួយក្រុម គោរពមនុស្ស និងទីកន្លែង អនុវត្តតាមច្បាប់ និងកុំប្រថុយគ្រោះថ្នាក់។',
      'hero.tagline': 'ចូលរួមក្រុមរបស់អ្នក។ រុករកទីក្រុង។ ឡើងទៅកំពូលតារាងពិន្ទុ។',
      'join.title': 'ចូលរួមការប្រកួត',
      'join.intro': 'បញ្ចូលឈ្មោះ និងជ្រើសរើសរាជធានី/ខេត្ត។ យើងនឹងដាក់អ្នកក្នុងក្រុមដែលមានសមាជិក ៤–៥ នាក់ដោយស្វ័យប្រវត្តិ។',
      'join.name': 'ឈ្មោះរបស់អ្នក',
      'join.namePlaceholder': 'ឧ. សុខា',
      'join.province': 'រាជធានី / ខេត្ត',
      'join.selectProvince': 'ជ្រើសរើសរាជធានី ឬខេត្ត',
      'join.button': 'ស្វែងរកក្រុមរបស់ខ្ញុំ',
      'join.missing': 'សូមបញ្ចូលឈ្មោះ និងជ្រើសរើសរាជធានី/ខេត្ត។',
      'join.finding': 'កំពុងស្វែងរកក្រុមរបស់អ្នក…',
      'team.your': 'ក្រុមរបស់អ្នក',
      'team.settings': '⚙️ ការកំណត់ក្រុម',
      'team.customize': 'កែសម្រួលក្រុមរបស់អ្នក',
      'team.name': 'ឈ្មោះក្រុម',
      'team.chooseIcon': 'ជ្រើសរើសរូបតំណាង',
      'team.chooseColor': 'ជ្រើសរើសពណ៌',
      'team.save': 'រក្សាទុកក្រុម',
      'team.saving': 'កំពុងរក្សាទុក…',
      'timer.label': 'ម៉ោងប្រកួត',
      'timer.waitingStatus': 'កំពុងរង់ចាំចាប់ផ្តើម',
      'timer.waiting': 'កំពុងរង់ចាំអ្នករៀបចំចាប់ផ្តើមការប្រកួត',
      'timer.live': 'ការប្រកួតកំពុងដំណើរការ',
      'timer.go': 'ទៅ! ទៅ! ទៅ!',
      'timer.finished': 'ការប្រកួតបានបញ្ចប់',
      'timer.timesUp': 'អស់ពេលហើយ!',
      'timer.final': 'អស់ពេលហើយ! សូមមើលតារាងពិន្ទុចុងក្រោយ។',
      'sync.updated': 'បន្តផ្ទាល់ · ទើបតែធ្វើបច្ចុប្បន្នភាព',
      'sync.refresh': 'ធ្វើឱ្យថ្មី',
      'sync.failed': 'ការធ្វើបច្ចុប្បន្នភាពបានផ្អាក — ចុចធ្វើឱ្យថ្មី',
      'tabs.challenges': 'បេសកកម្ម',
      'tabs.leaderboard': 'តារាងពិន្ទុ',
      'tabs.feed': 'រូបភាពថ្មីៗ',
      'progress.approved': 'បានអនុម័ត {approved} ក្នុងចំណោម {total} បេសកកម្ម',
      'challenge.heading': 'បេសកកម្ម',
      'challenge.approved': 'បានអនុម័ត — បានបន្ថែមពិន្ទុ 🎉',
      'challenge.pending': 'បានដាក់ស្នើ — កំពុងរង់ចាំអ្នករៀបចំពិនិត្យ ⏳',
      'challenge.rejected': 'មិនបានអនុម័ត — {reason}។ ក្រុមរបស់អ្នកអាចសាកល្បងម្តងទៀត។',
      'challenge.retry': 'ដាក់ស្នើម្តងទៀត',
      'challenge.complete': 'បំពេញបេសកកម្ម',
      'challenge.closed': 'ការប្រកួតបានបញ្ចប់ហើយ។',
      'challenge.photo': 'រូបថត',
      'challenge.video': 'វីដេអូ',
      'category.city': 'ក្នុងក្រុង',
      'category.people': 'មនុស្ស',
      'category.adventure': 'ដំណើរផ្សងព្រេង',
      'category.temple': 'ប្រាសាទ',
      'category.landmark': 'ទីតាំងសំខាន់',
      'category.creative': 'ច្នៃប្រឌិត',
      'category.food': 'អាហារ',
      'points.base': '{points} ពិន្ទុ',
      'points.bonus': '{points} ពិន្ទុ + បន្ថែម',
      'points.each': '{points} ពិន្ទុ/ម្នាក់',
      'leaderboard.heading': 'តារាងពិន្ទុបន្តផ្ទាល់',
      'leaderboard.empty': 'មិនទាន់មានពិន្ទុទេ។',
      'leaderboard.details': '{challenges} បេសកកម្ម · {members} សមាជិក',
      'feed.heading': 'រូបភាពសហគមន៍',
      'feed.empty': 'ការដាក់ស្នើដែលបានអនុម័តនឹងបង្ហាញនៅទីនេះ។',
      'feed.completed': '{team} បានបំពេញ {challenge}',
      'upload.eyebrow': 'បំពេញបេសកកម្ម',
      'upload.media': 'រូបថត / វីដេអូ',
      'upload.submit': 'ដាក់ស្នើបេសកកម្ម',
      'upload.submitting': 'កំពុងដាក់ស្នើ…',
      'upload.choose': 'សូមជ្រើសរើសរូបថត ឬវីដេអូ។',
      'upload.tooLarge': 'ឯកសារធំពេក។ សូមជ្រើសរើសឯកសារតិចជាង 12 MB។',
      'upload.unsupported': 'សូមជ្រើសរើសរូបថត ឬវីដេអូដែលគាំទ្រ។',
      'upload.requires': 'បេសកកម្មនេះតម្រូវឱ្យមាន {kind}។',
      'upload.bonusRange': 'ចំនួនបន្ថែមត្រូវចន្លោះពី 0 ដល់ {max}។',
      'upload.bonusUnits': 'ចំនួនបន្ថែម',
      'upload.bonusHint': '+{points} ពិន្ទុក្នុងមួយចំនួន · អតិបរមា {max}',
      'upload.preparing': 'កំពុងរៀបចំឯកសារ… {percent}%',
      'upload.uploading': 'កំពុងបង្ហោះដោយសុវត្ថិភាព… សូមកុំបិទទំព័រនេះ។',
      'upload.review': 'បង្ហោះរួចរាល់ — បានផ្ញើឱ្យអ្នករៀបចំពិនិត្យ។',
      'upload.failed': 'បង្ហោះមិនបានជោគជ័យ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយសាកល្បងម្តងទៀត។ {detail}',
      'connection.offline': 'អ្នកគ្មានអ៊ីនធឺណិត។ សូមកុំបិទទំព័រ ហើយភ្ជាប់អ៊ីនធឺណិតមុនពេលបង្ហោះ។',
      'connection.online': 'បានភ្ជាប់អ៊ីនធឺណិតវិញហើយ។',
      'reason.unclear': 'រូបថត ឬវីដេអូមិនច្បាស់',
      'reason.wrong_challenge': 'ភស្តុតាងមិនត្រូវនឹងទីតាំង ឬបេសកកម្ម',
      'reason.missing_people': 'ខ្វះសមាជិកក្រុមតាមការកំណត់',
      'reason.requirements': 'មិនបានបំពេញលក្ខខណ្ឌបេសកកម្ម',
      'reason.other_retry': 'សូមធ្វើបេសកកម្មឡើងវិញ និងបង្ហោះភស្តុតាងឱ្យច្បាស់ជាងមុន',
    },
  };

  const provinceNames = {
    'Banteay Meanchey': 'បន្ទាយមានជ័យ', Battambang: 'បាត់ដំបង', 'Kampong Cham': 'កំពង់ចាម',
    'Kampong Chhnang': 'កំពង់ឆ្នាំង', 'Kampong Speu': 'កំពង់ស្ពឺ', 'Kampong Thom': 'កំពង់ធំ',
    Kampot: 'កំពត', Kandal: 'កណ្ដាល', Kep: 'កែប', 'Koh Kong': 'កោះកុង', Kratie: 'ក្រចេះ',
    Mondulkiri: 'មណ្ឌលគិរី', 'Oddar Meanchey': 'ឧត្តរមានជ័យ', Pailin: 'ប៉ៃលិន',
    'Phnom Penh': 'ភ្នំពេញ', 'Preah Sihanouk': 'ព្រះសីហនុ', 'Preah Vihear': 'ព្រះវិហារ',
    'Prey Veng': 'ព្រៃវែង', Pursat: 'ពោធិ៍សាត់', Ratanakiri: 'រតនគិរី', 'Siem Reap': 'សៀមរាប',
    'Stung Treng': 'ស្ទឹងត្រែង', 'Svay Rieng': 'ស្វាយរៀង', Takeo: 'តាកែវ', 'Tboung Khmum': 'ត្បូងឃ្មុំ',
  };

  const challengeTranslations = {
    'Smoothie Stop': ['កន្លែងលក់ទឹកផ្លែឈើក្រឡុក', 'ថតរូបក្រុមនៅកន្លែងលក់ទឹកផ្លែឈើក្រឡុក។'],
    'Durian Crew': ['ក្រុមធុរេន', 'សមាជិកក្រុមគ្រប់គ្នាកាន់ផ្លែធុរេនក្នុងរូបថត។'],
    'White Dream Moto': ['ម៉ូតូ Dream ពណ៌ស', 'ថតរូបក្រុមជាមួយម៉ូតូ Honda Dream ពណ៌ស។'],
    Zando: ['Zando', 'ថតរូបក្រុមនៅមុខហាង Zando។'],
    'Dance on Pub Street': ['រាំនៅផាប់ស្ទ្រីត', 'ថតវីដេអូក្រុមរបស់អ្នកកំពុងរាំនៅផាប់ស្ទ្រីត។'],
    'High Five Five': ['ហាយហ្វាយ ៥ នាក់', 'ថតវីដេអូក្រុមរបស់អ្នកហាយហ្វាយជាមួយមនុស្សចម្លែក ៥ នាក់។'],
    'Human Pyramid': ['ពីរ៉ាមីតមនុស្ស', 'បង្កើតពីរ៉ាមីតមនុស្ស។ ទទួលពិន្ទុបន្ថែមសម្រាប់មនុស្សចម្លែកដែលចូលរួម។'],
    'Everybody In': ['ចូលទឹកទាំងអស់គ្នា', 'ឱ្យសមាជិកក្រុមចូលក្នុងអាងហែលទឹក។ ទទួលពិន្ទុសម្រាប់សមាជិកម្នាក់ៗដែលនៅក្នុងទឹក។'],
    'Angkor Wat': ['អង្គរវត្ត', 'ថតរូបក្រុមនៅអង្គរវត្ត។'],
    'Find the Dinosaur': ['ស្វែងរកដាយណូស័រ', 'ស្វែងរកចម្លាក់ដែលមើលទៅដូចដាយណូស័រនៅប្រាសាទ ហើយថតរូបក្រុម។'],
    'Angkor Botanical Garden': ['សួនរុក្ខជាតិអង្គរ', 'ថតរូបក្រុមនៅមុខច្រកចូលសួនរុក្ខជាតិអង្គរ។'],
    'Royal Residence': ['ព្រះរាជដំណាក់', 'ថតរូបក្រុមនៅខាងក្រៅព្រះរាជដំណាក់ក្នុងក្រុងសៀមរាប។ កុំចូលក្នុងតំបន់ហាមឃាត់។'],
    'Bookstore Browse': ['ហាងលក់សៀវភៅ', 'ថតរូបក្រុមនៅក្នុងហាងលក់សៀវភៅ បន្ទាប់ពីសុំការអនុញ្ញាតពីបុគ្គលិក។'],
    'Starbucks Stop': ['Starbucks', 'ថតរូបក្រុមនៅក្នុង Starbucks ដោយមិនរំខានអតិថិជន ឬបុគ្គលិក។'],
    'Tuk Tuk Team': ['ក្រុមលើរ៉ឺម៉កកង់បី', 'ថតរូបសមាជិកក្រុមទាំងអស់អង្គុយដោយសុវត្ថិភាពក្នុងរ៉ឺម៉កកង់បីមួយ។ ទទួលពិន្ទុបន្ថែមបើវាមានពណ៌ក្រហម។'],
    'Find Levi Brill': ['ស្វែងរក Levi Brill', 'ស្វែងរក Levi Brill ហើយថតសែលហ្វីជាក្រុមជាមួយគាត់ បន្ទាប់ពីសុំការអនុញ្ញាត។'],
    'Reenact the Last Supper': ['សម្ដែងពិធីលៀងចុងក្រោយឡើងវិញ', 'រៀបចំការសម្ដែងពិធីលៀងចុងក្រោយដោយគោរព ហើយថតរូបក្រុម។'],
    'Riverside Elephant': ['ដំរីក្បែរមាត់ទន្លេ', 'ស្វែងរកដំរីក្បែរមាត់ទន្លេសៀមរាប ហើយថតរូបក្រុមនៅក្បែរវា។'],
    'Old Market': ['ផ្សារចាស់', 'ថតរូបក្រុមនៅផ្សារចាស់ ដោយមិនរារាំងអ្នកលក់ ឬអ្នកដើរផ្សារ។'],
    'Find Thean Tinh': ['ស្វែងរក Thean Tinh', 'ស្វែងរក Thean Tinh ហើយថតសែលហ្វីជាក្រុម បន្ទាប់ពីសុំការអនុញ្ញាត។'],
    'Fruit Salad Team': ['ក្រុមផ្លែឈើ', 'ថតរូបសមាជិកក្រុមម្នាក់ៗកាន់ផ្លែឈើមួយប្រភេទខុសៗគ្នា។'],
    'One Moto, Whole Team': ['ម៉ូតូមួយ ក្រុមទាំងមូល', 'ប្រមូលក្រុមទាំងមូលនៅលើ និងជុំវិញម៉ូតូដែលចតស្ងៀម សម្រាប់ថតរូប ឬវីដេអូ។ បិទម៉ាស៊ីន ដកសោចេញ ហើយកុំជិះផ្ទុកមនុស្សលើសកំណត់។'],
    'Five International Friends': ['មិត្តអន្តរជាតិ ៥ នាក់', 'ថតរូបក្រុមមួយសន្លឹកជាមួយភ្ញៀវអន្តរជាតិ ៥ នាក់ដែលជាមនុស្សមិនស្គាល់ និងមិនមែនជាសមាជិក YWAM។ សុំការអនុញ្ញាតជាមុន។'],
    'Animal Encounter': ['ជួបសត្វ', 'ថតរូបក្រុមជាមួយសត្វរស់ រូបសំណាកសត្វ ឬអាហារដែលរៀបចំរួច។ រក្សាគម្លាតសុវត្ថិភាព ហើយកុំប៉ះ ឬរំខានសត្វរស់។'],
  };

  window.currentLanguage = localStorage.getItem('hunt_language') === 'km' ? 'km' : 'en';
  window.t = function translate(key, values = {}) {
    let value = translations[window.currentLanguage]?.[key] || translations.en[key] || key;
    Object.entries(values).forEach(([name, replacement]) => {
      value = value.replaceAll(`{${name}}`, String(replacement));
    });
    return value;
  };

  window.translateChallenge = function translateChallenge(challenge) {
    if (window.currentLanguage !== 'km') return challenge;
    const translated = challengeTranslations[challenge.title];
    return translated ? { ...challenge, title: translated[0], description: translated[1] } : challenge;
  };

  window.translateCategory = function translateCategory(category) {
    return translations[window.currentLanguage]?.['category.' + category] || category;
  };

  window.applyI18n = function applyI18n() {
    document.documentElement.lang = window.currentLanguage === 'km' ? 'km' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = window.t(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      element.placeholder = window.t(element.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-language]').forEach((button) => {
      button.classList.toggle('active', button.dataset.language === window.currentLanguage);
    });
    const province = document.getElementById('base');
    if (province) {
      [...province.options].forEach((option) => {
        if (!option.value) option.textContent = window.t('join.selectProvince');
        else option.textContent = window.currentLanguage === 'km'
          ? provinceNames[option.value] || option.value
          : option.dataset.english || option.value;
      });
    }
  };

  window.setLanguage = function setLanguage(language) {
    window.currentLanguage = language === 'km' ? 'km' : 'en';
    localStorage.setItem('hunt_language', window.currentLanguage);
    window.applyI18n();
    window.renderLocalizedApp?.();
  };
})();
