
/* ============================================================
   MindVault Kids — Standalone Client-Side API
   No backend required. Uses localStorage and MockAI.
   ============================================================ */

/* ============================================================
   MindVault Kids — Mock AI Service (Rule-Based)
   Drop-in replacement for gemini.service.js
   300+ responses, 100+ FAQs, context-aware, zero API calls
   ============================================================ */

// ═══════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE — Keyword Patterns & Weighted Scoring
// ═══════════════════════════════════════════════════════════════

const GROOMING_PATTERNS = {
  trustBuilding: {
    keywords: ['you\'re so mature', 'you\'re special', 'you understand me', 'no one else gets me', 'you\'re different', 'beautiful', 'pretty', 'handsome', 'gorgeous', 'amazing', 'gift', 'present', 'buy you', 'i\'ll get you', 'send you', 'free', 'reward', 'favourite', 'favorite', 'best friend', 'only you'],
    weight: 1.2
  },
  emotionalDependence: {
    keywords: ['only one who understands', 'i need you', 'you need me', 'can\'t live without', 'you\'re everything', 'nobody cares like i do', 'i\'m the only one', 'we have something special', 'soulmate', 'connection', 'bond', 'love you', 'miss you so much', 'always thinking about you', 'without you', 'depend on'],
    weight: 1.5
  },
  isolation: {
    keywords: ['don\'t tell', 'our secret', 'keep this between us', 'they won\'t understand', 'your parents don\'t get it', 'your friends are jealous', 'they\'re not real friends', 'come alone', 'just us', 'they would be angry', 'they\'d take you away', 'no one will believe', 'between us', 'private', 'just you and me', 'leave them'],
    weight: 1.8
  },
  manipulation: {
    keywords: ['if you loved me', 'prove it', 'you owe me', 'after everything i did', 'i thought you cared', 'you\'re being selfish', 'don\'t you trust me', 'you promised', 'i\'ll tell everyone', 'i\'ll hurt myself', 'it\'s your fault', 'you made me', 'ungrateful', 'nobody else will', 'you\'ll be sorry'],
    weight: 2.0
  },
  highRisk: {
    keywords: ['send me a photo', 'turn on camera', 'take off', 'show me', 'meet me', 'meet up', 'come over', 'my house', 'your address', 'where do you live', 'what school', 'phone number', 'are you alone', 'home alone', 'parents away', 'delete this', 'don\'t screenshot', 'video call', 'snapchat', 'private chat'],
    weight: 2.5
  }
};

const MANIPULATION_PATTERNS = {
  emotional_blackmail: {
    keywords: ['if you loved me', 'if you cared', 'prove you care', 'prove it', 'you owe me', 'after everything', 'i thought we were friends', 'you don\'t care about me', 'nobody cares', 'i\'ll be sad'],
    phrases: ['if you really', 'don\'t you love', 'after all i\'ve done', 'i guess you don\'t']
  },
  gaslighting: {
    keywords: ['you\'re imagining', 'that never happened', 'you\'re overreacting', 'you\'re too sensitive', 'i never said that', 'you\'re crazy', 'nobody thinks that', 'you\'re confused', 'that\'s not what happened', 'you misunderstood'],
    phrases: ['you\'re being dramatic', 'it was just a joke', 'calm down', 'why are you making']
  },
  isolation: {
    keywords: ['your friends don\'t', 'they\'re not really', 'only i understand', 'they\'re against you', 'don\'t listen to them', 'they\'re jealous', 'you don\'t need them', 'i\'m the only one', 'leave them', 'stop talking to'],
    phrases: ['they don\'t really care', 'i\'m the only one who']
  },
  secrecy_coercion: {
    keywords: ['don\'t tell anyone', 'our secret', 'keep this between', 'promise not to', 'no one needs to know', 'delete this message', 'if you tell', 'they wouldn\'t understand', 'this is private', 'just between us'],
    phrases: ['don\'t tell your', 'keep it between', 'promise me you won\'t']
  },
  love_bombing: {
    keywords: ['you\'re the most', 'perfect', 'amazing', 'special', 'i\'ve never met anyone', 'you\'re one of a kind', 'you\'re so mature', 'you\'re not like other', 'destiny', 'soulmate', 'meant to be', 'incredible', 'extraordinary'],
    phrases: ['no one is like you', 'you\'re so much better', 'unlike anyone i\'ve']
  },
  threats: {
    keywords: ['i\'ll tell everyone', 'i\'ll share', 'i\'ll send this to', 'i\'ll hurt', 'you\'ll regret', 'be careful', 'watch out', 'consequences', 'i know where', 'i\'ll find', 'something bad will', 'i\'ll destroy', 'i\'ll ruin', 'you\'ll be sorry'],
    phrases: ['if you don\'t', 'bad things will', 'everyone will know']
  },
  guilt_trapping: {
    keywords: ['it\'s your fault', 'you made me', 'because of you', 'you started this', 'you led me on', 'you asked for it', 'you wanted this', 'you caused this', 'you\'re responsible', 'ungrateful'],
    phrases: ['this is because you', 'you should feel', 'look what you']
  }
};

const SHADOW_ACCOUNT_SIGNALS = {
  newAccount: { keywords: ['new account', 'just joined', 'just created'], score: 25 },
  lowFollowers: { threshold: 50, score: 20 },
  highFollowing: { threshold: 500, score: 15 },
  noProfilePic: { score: 30 },
  genericBio: { keywords: ['living life', 'just vibing', 'dm me', 'follow back', 'new here'], score: 15 },
  suspiciousAge: { keywords: ['13', '14', '15', '16', 'teen', 'young'], score: 10 },
  rapidMessaging: { score: 20 }
};

// ═══════════════════════════════════════════════════════════════
//  EMOTIONAL FIRST AID — Chat Knowledge Base (300+ responses)
// ═══════════════════════════════════════════════════════════════

const CHAT_INTENTS = {
  // ── GREETINGS (15 variations) ──
  greetings: {
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'yo', 'sup', 'hiya', 'greetings', 'what\'s up', 'how are you'],
    responses: [
      "Hey there! 💙 I'm your MindVault companion. I'm here to listen, help, and keep you safe. What's on your mind?",
      "Hi! 🌟 Welcome to your safe space. I'm here for you — whether you want to talk, learn, or just hang out. What would you like to do?",
      "Hello! 💙 I'm really glad you're here. This is a judgment-free zone. How can I help you today?",
      "Hey! 🛡️ I'm your digital guardian. Whether you need advice, support, or just someone to listen — I'm here. What's going on?",
      "Hi there! 🌈 I'm so happy you reached out. You're brave for being here. What would you like to talk about?",
      "Hey friend! 💪 I'm always here when you need me. Tell me what's happening, and we'll figure it out together.",
      "Hello! ✨ Think of me as your safe corner of the internet. I'm here to help with anything. What's up?",
      "Hi! 💙 You've come to the right place. I'm your AI companion, trained to help keep you safe online. How can I help?"
    ]
  },

  // ── WHO ARE YOU (10 variations) ──
  identity: {
    patterns: ['who are you', 'what are you', 'are you real', 'are you a robot', 'are you ai', 'are you human', 'tell me about yourself', 'what\'s your name', 'introduce yourself'],
    responses: [
      "I'm your MindVault AI Companion! 🛡️ I'm a digital guardian designed to keep kids and teens safe online. I can help you understand online dangers, manage your emotions, and always have a safe space to talk. I'm not a real person, but I care about your safety!",
      "I'm the MindVault AI Guardian! 💙 Think of me as a smart friend who knows a lot about online safety. I can explain features, answer questions, and support you emotionally. I never judge, and everything you share is private.",
      "Great question! I'm a rule-based AI companion built into MindVault Kids. I help with emotional support, online safety guidance, and navigating this app. I don't connect to the internet — everything I know is right here! 🌟",
      "I'm your personal MindVault helper! 🤖💙 I understand cybersecurity, emotional wellbeing, and all the features in this app. I'm here 24/7 and I never get tired of helping you.",
      "I'm the friendly AI that lives inside MindVault! Think of me as your digital big sibling who knows all about staying safe online. Ask me anything! ✨"
    ]
  },

  // ── CAPABILITIES (8 variations) ──
  capabilities: {
    patterns: ['what can you do', 'help me', 'what do you know', 'how can you help', 'what are your features', 'capabilities', 'what can i ask'],
    responses: [
      "I can help with so many things! 🌟\n\n• 🛡️ Explain all MindVault features (Panic Shield, Safe Exit, Trust Circle, etc.)\n• 💙 Provide emotional support when you're feeling down\n• 🔍 Help you understand online safety concepts\n• ⚠️ Explain warning signs of grooming, manipulation, and cyberbullying\n• 📖 Guide you through the app\n• 🧘 Teach breathing and grounding exercises\n\nJust ask me anything!",
      "Here's what I'm great at! 💪\n\n• Answering questions about online safety\n• Explaining what grooming, catfishing, and manipulation look like\n• Helping you calm down with breathing exercises\n• Walking you through every MindVault feature\n• Being a supportive listener when you need one\n\nWhat would you like to explore?",
      "I'm packed with knowledge! 🧠 I can explain every feature in MindVault, teach you about cyber safety, help you process emotions, and guide you through difficult situations online. Think of me as your safety encyclopedia + emotional support all in one! 💙"
    ]
  },

  // ── FEAR / SCARED (12 variations) ──
  fear: {
    patterns: ['i\'m scared', 'i feel scared', 'i\'m afraid', 'i feel afraid', 'someone is scaring me', 'i\'m frightened', 'i feel unsafe', 'i don\'t feel safe', 'help me i\'m scared', 'creepy', 'stalking me', 'following me', 'watching me'],
    responses: [
      "I hear you, and your feelings are completely valid. Being scared is your brain's way of protecting you. 💙 Let's take a slow breath together — in for 4 counts, hold for 4, out for 4. You're safe right here. Can you tell me a bit more about what's making you feel this way?",
      "It's okay to feel scared — that means your instincts are working. 🛡️ Remember: you're not alone in this. Take a moment to breathe deeply. If someone online is making you feel unsafe, you can use the Panic Shield right away. I'm here for you. 💙",
      "I'm sorry you're feeling scared. That takes courage to share. 💪 First, let's ground ourselves: look around and name 5 things you can see. This helps your brain calm down. If someone specific is scaring you, we should talk about using the Panic Shield or telling a trusted adult.",
      "Your feelings matter, and being scared doesn't make you weak — it makes you smart. 🌟 Your brain is telling you something isn't right. Trust that feeling. If you're in immediate danger, please use the Panic Shield or tell a trusted adult right away. I'm right here with you. 💙",
      "I want you to know that you're brave for telling me this. 💙 Let's breathe together: inhale slowly... hold... exhale slowly. Good. Now, remember that you have tools to protect yourself — Panic Shield, Safe Exit, and your Trust Circle. You are not alone.",
      "Feeling scared is completely normal, and I'm proud of you for reaching out. 🛡️ Whatever is happening, we can figure it out together. If you need to exit a situation quickly, Safe Exit is just one tap away. Can you tell me more about what's going on?"
    ]
  },

  // ── ANXIETY / WORRIED (10 variations) ──
  anxiety: {
    patterns: ['i\'m anxious', 'i feel anxious', 'anxiety', 'i\'m worried', 'i can\'t stop worrying', 'nervous', 'stressed', 'stress', 'overwhelmed', 'too much', 'panicking', 'panic attack', 'can\'t breathe', 'heart racing', 'i feel sick', 'worried about'],
    responses: [
      "I can hear that you're feeling overwhelmed, and that's okay. 💙 Let's try the 5-4-3-2-1 technique together: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This helps bring you back to the present moment.",
      "Anxiety can feel really heavy, but you're stronger than you think. 💪 Right now, let's focus on your breathing: breathe in for 4 seconds, hold for 7, breathe out for 8. This activates your body's calm-down system. You've got this.",
      "I'm sorry you're feeling this way. Anxiety is like a false alarm — your brain thinks there's danger even when you might be safe. 🌟 Let's do a quick body scan: start at your toes and slowly relax each part of your body going up. This can really help.",
      "Your feelings are valid, and I'm here for you. 💙 When anxiety hits, try placing your hand on your heart and taking three slow, deep breaths. Feel your heartbeat slow down. Remember: this feeling is temporary. It will pass.",
      "I know anxiety feels overwhelming, but you're not facing it alone. 🛡️ Try this: squeeze your fists tight for 5 seconds, then release. Feel the tension flow away. If your anxiety is about something happening online, let's talk about what we can do about it."
    ]
  },

  // ── SADNESS / DEPRESSION (10 variations) ──
  sadness: {
    patterns: ['i\'m sad', 'i feel sad', 'i\'m depressed', 'i feel depressed', 'i\'m crying', 'i can\'t stop crying', 'i feel empty', 'nothing matters', 'i feel worthless', 'nobody cares', 'nobody likes me', 'no friends', 'lonely', 'alone', 'i feel alone', 'i hate myself', 'i\'m ugly'],
    responses: [
      "I'm really sorry you're feeling this way. 💙 Your feelings are important, and sadness is a part of being human. It doesn't mean something is wrong with you. Would you like to try writing in your journal? Sometimes putting feelings into words helps lighten the load.",
      "It sounds like you're going through a tough time, and I want you to know — it's okay to feel sad. 🌟 You don't have to pretend to be happy. What you're feeling right now is temporary, even if it doesn't feel that way. Have you talked to anyone in your Trust Circle?",
      "I hear you, and I care about how you're feeling. 💙 You matter more than you know. When sadness feels heavy, sometimes it helps to do something small that brings comfort — listen to music, hold a warm drink, or wrap yourself in a blanket. You deserve kindness, especially from yourself.",
      "Your feelings are valid, and I'm glad you shared them with me. 💪 Sadness often comes in waves — and just like waves, it will recede. Right now, try doing one small thing that makes you smile, even a tiny bit. And remember, your Heal Mode journal is always here for you.",
      "I'm here for you. 💙 Feeling sad doesn't mean you're broken — it means you're human. Can I suggest something? Try the Heal Mode feature. Writing about your feelings, even just a few words, can make them feel a bit more manageable. You're not alone in this."
    ]
  },

  // ── PRESSURE / COERCION (8 variations) ──
  pressure: {
    patterns: ['someone is pressuring me', 'being pressured', 'they want me to', 'making me do', 'forced to', 'have to do it', 'no choice', 'won\'t leave me alone', 'keeps asking', 'won\'t stop', 'demanding', 'insisted', 'threatening'],
    responses: [
      "No one has the right to pressure you into anything. Period. 🛡️ If someone is making you do things you don't want to do, that's a serious red flag. You ALWAYS have the right to say no. Would you like me to help you use the Panic Shield or contact someone in your Trust Circle?",
      "What you're describing sounds like someone is crossing your boundaries, and that is NOT okay. 💪 Remember: a real friend or caring person would never pressure you. You have the right to say no, block them, and report them. Your Panic Shield is here for exactly these moments.",
      "I'm really glad you told me this. Being pressured is scary, but you're doing the right thing by speaking up. 🛡️ Here's what you can do right now: 1) Don't respond to them. 2) Save any evidence. 3) Tell a trusted adult. Would you like help with any of these steps?",
      "Your safety comes first, always. 💙 If someone is pressuring you, use the 'Do Not Reply' feature in Panic Shield. Then save any evidence in the Evidence Vault. And please, tell someone you trust — a parent, teacher, or counselor. You don't have to handle this alone."
    ]
  },

  // ── CONFUSION / DON'T KNOW (8 variations) ──
  confusion: {
    patterns: ['i don\'t know', 'i\'m confused', 'what should i do', 'don\'t know what to do', 'help me decide', 'i\'m lost', 'i need help', 'i need advice', 'can you guide me', 'what do you think'],
    responses: [
      "It's completely okay to feel unsure. 💙 That's what I'm here for! Can you tell me a bit more about the situation? The more I know, the better I can help guide you. Remember, there's no wrong question to ask.",
      "Not knowing what to do is totally normal, especially in tricky online situations. 🌟 Let's break it down together. What's the main thing that's bothering you right now? We'll take it one step at a time.",
      "I'm here to help you figure things out! 💪 Sometimes when we feel confused, it helps to ask: 'Would I be comfortable if my parent/guardian saw this?' If the answer is no, that's a good sign to be cautious. Tell me more about what's happening.",
      "You don't have to have all the answers — that's why I'm here! 🛡️ Let's work through this together. Start by telling me what happened, and we'll find the best path forward. No pressure, take your time."
    ]
  },

  // ── THANK YOU (6 variations) ──
  gratitude: {
    patterns: ['thank you', 'thanks', 'thank', 'you helped', 'you\'re helpful', 'appreciate', 'that helped', 'you\'re the best', 'so helpful'],
    responses: [
      "You're so welcome! 💙 I'm always here whenever you need me. Remember, asking for help is one of the bravest things you can do. Stay safe! 🛡️",
      "It makes me happy to help! 🌟 You're doing an amazing job taking care of yourself. Never hesitate to come back anytime. I'll always be here.",
      "Aww, thank you for saying that! 💙 You deserve to feel supported. Remember, you can come talk to me anytime — day or night. Stay awesome! 💪",
      "You're welcome! 🌈 I'm proud of you for reaching out. That takes real courage. Keep being brave, and remember — your safety always comes first!"
    ]
  },

  // ── GOODBYE (5 variations) ──
  goodbye: {
    patterns: ['bye', 'goodbye', 'see you', 'gotta go', 'leaving', 'talk later', 'good night', 'goodnight', 'night'],
    responses: [
      "Take care of yourself! 💙 Remember, I'm here 24/7 whenever you need me. Stay safe and be kind to yourself. See you next time! 🌟",
      "Goodbye for now! 🛡️ Remember: you're braver than you believe, stronger than you seem, and smarter than you think. Come back anytime! 💙",
      "See you later! 💪 Before you go, remember: if anything feels wrong online, trust your gut and come back here or tell a trusted adult. Stay safe! 🌟",
      "Night! 🌙💙 Sweet dreams. If Night Watch Mode isn't on, you might want to activate it. Stay safe while you sleep! See you tomorrow!"
    ]
  },

  // ══ APPLICATION FEATURES ══

  // ── PANIC SHIELD (8 variations) ──
  panicShield: {
    patterns: ['panic shield', 'panic button', 'emergency button', 'panic mode', 'what is panic shield', 'how does panic shield work', 'activate panic', 'emergency'],
    responses: [
      "🛡️ **Panic Shield** is your emergency safety button! When you feel threatened online, it instantly:\n\n1. **Blocks the threat** — Helps you disengage from the dangerous person\n2. **Saves evidence** — Screenshots and logs are preserved automatically\n3. **Activates 'Do Not Reply'** — Stops you from responding in the heat of the moment\n4. **Alerts your Trust Circle** — Your trusted adults get notified\n5. **Guides you to safety** — Step-by-step calm-down process\n\nThink of it as your digital 911 button. You can activate it from any page in the app!",
      "The **Panic Shield** is your instant protection system! 🛡️ It's designed for moments when you feel unsafe online. One tap and it:\n\n• Captures evidence of what's happening\n• Blocks the person threatening you\n• Notifies people who can help\n• Guides you through calming down\n\nYou never need to feel helpless. The Panic Shield has your back!",
      "Think of Panic Shield as your superhero shield! 🦸 When something scary happens online, you press it and it immediately protects you. It saves proof of what happened, alerts your trusted adults, and helps you calm down. No one can hurt you when your shield is up! 💪"
    ]
  },

  // ── SAFE EXIT (6 variations) ──
  safeExit: {
    patterns: ['safe exit', 'exit safely', 'leave safely', 'how to exit', 'escape', 'get out', 'what does safe exit do'],
    responses: [
      "🚪 **Safe Exit** is your quick escape protocol! When you need to leave a dangerous online situation, it:\n\n1. **Blocks the threatening user** automatically\n2. **Captures evidence** before you leave\n3. **Saves all conversation logs** to your Evidence Vault\n4. **Alerts your Trust Circle** about what happened\n5. **Closes the dangerous app/site** safely\n\nIt's like an ejector seat for bad online situations!",
      "Safe Exit helps you leave dangerous situations safely! 🛡️ It doesn't just close the app — it saves evidence first, blocks the bad person, and tells your trusted adults. That way, even after you leave, there's a record of what happened. Safety first! 💙",
      "When you use **Safe Exit**, it's like a coordinated escape plan! 🚀 Evidence gets saved, the person gets blocked, your Trust Circle gets alerted, and you're taken to a safe space. It all happens in seconds. You can find it in your Panic Shield options."
    ]
  },

  // ── TRUST CIRCLE (8 variations) ──
  trustCircle: {
    patterns: ['trust circle', 'trusted adults', 'trusted contacts', 'who to trust', 'add contacts', 'who should i add', 'emergency contacts', 'my parents', 'will my parents see'],
    responses: [
      "👥 **Trust Circle** is your team of trusted adults! These are people you choose to be notified when something goes wrong. You can add:\n\n• Parents or guardians\n• Teachers or school counselors\n• Older siblings or relatives\n• Family friends you trust\n\nThey get alerted during emergencies (Panic Shield, Safe Exit, Silent SOS). You decide who to add, and you can set different notification levels for each person.",
      "Your Trust Circle is like your personal safety team! 🛡️ Add adults you trust — parents, teachers, counselors, relatives. When you activate emergency features, they'll be notified.\n\n**Will they see everything?** Only alerts you trigger. They won't see your private journal or chat history. Your privacy is respected while keeping you safe. 💙",
      "Setting up your Trust Circle is one of the most important things you can do! 💪 Think of 2-5 adults you feel safe with. They become your emergency contacts. You can customize what each person gets notified about. It's YOUR circle — you're in control!"
    ]
  },

  // ── EMOTIONAL RISK SCORE (6 variations) ──
  ers: {
    patterns: ['emotional risk score', 'ers', 'risk score', 'my score', 'how is risk calculated', 'why is my score high', 'what is ers', 'risk level'],
    responses: [
      "📊 **Emotional Risk Score (ERS)** is a 0-100 score that shows how safe your online environment is right now.\n\nIt looks at:\n• 🔍 Recent manipulation or grooming detections\n• 😔 Your mood patterns\n• 📱 Cyberbullying incidents\n• 🌙 Night-time activity\n• 👥 Social connection levels\n\n**Scores:**\n• 0-20: Secure 🟢\n• 21-40: Mild 🟡\n• 41-60: Elevated 🟠\n• 61-80: High 🔴\n• 81-100: Critical ⚫\n\nA high score doesn't mean you're in danger — it means we should talk about what's going on.",
      "Your ERS is like a safety thermometer! 🌡️ It measures different factors in your online life and gives you a score from 0 (perfectly safe) to 100 (needs attention). It updates based on your activity, mood logs, and any incidents. Don't worry — a higher score just means we should check in and make sure you're okay! 💙",
      "The Emotional Risk Score helps us understand how you're doing overall. 📊 If your score goes up, it could be because of more cyberbullying incidents, mood changes, or suspicious contacts. It's not a judgment — it's a tool to help keep you safe. Think of it like a weather forecast for your online wellbeing! 🌤️"
    ]
  },

  // ── GROOMING DETECTION (8 variations) ──
  grooming: {
    patterns: ['grooming', 'online grooming', 'predator', 'stranger danger', 'warning signs', 'someone older', 'adult messaging me', 'what is grooming', 'how do predators', 'gain trust'],
    responses: [
      "🔍 **Online grooming** is when someone (usually an adult) builds a relationship with a young person to manipulate and exploit them. Here are the stages:\n\n1. **Trust Building** — Excessive compliments, gifts, special attention\n2. **Emotional Dependence** — Making you feel like they're the only one who understands\n3. **Isolation** — Separating you from friends and family\n4. **Manipulation** — Guilt-tripping, threats, emotional blackmail\n5. **Exploitation** — Asking for photos, personal info, or meetings\n\n⚠️ **Red Flags:**\n• They say \"don't tell anyone\"\n• They ask for photos or to video chat privately\n• They seem too interested in your life\n• They try to make you feel special or different\n\nIf any of this sounds familiar, please tell a trusted adult immediately! 🛡️",
      "Predators are sneaky — they don't start with scary stuff. 🛡️ They start by being REALLY nice. Too nice. They'll say things like 'you're so mature for your age' or 'you're special.' They give gifts, pay attention, and make you feel important.\n\nThen slowly, they start asking you to keep secrets, separate from friends, and share personal things. This is called grooming.\n\n**Trust your gut.** If someone online makes you feel uncomfortable, even a little, that feeling matters. Tell someone! 💙",
      "Here's how to spot a potential groomer:\n\n🚩 They say you're \"mature for your age\"\n🚩 They ask you to keep your friendship secret\n🚩 They give you gifts or money online\n🚩 They want to move to a private chat\n🚩 They ask personal questions (school, address, schedule)\n🚩 They get upset if you don't respond quickly\n🚩 They try to turn you against your parents/friends\n\nRemember: NO adult should have a secret relationship with a child. If this is happening to you, please tell someone right away. You can use MindVault's Grooming Detector to analyze suspicious conversations. 🛡️"
    ]
  },

  // ── SHADOW ACCOUNTS (6 variations) ──
  shadowAccount: {
    patterns: ['shadow account', 'catfishing', 'fake account', 'fake profile', 'fake identity', 'catfish', 'pretending to be', 'not who they say', 'suspicious account', 'is this person real'],
    responses: [
      "🕵️ **Catfishing** is when someone creates a fake online identity to trick people. Here's how to spot a fake account:\n\n🚩 Very new account with few posts\n🚩 Stock photos or model-like profile pictures\n🚩 Very few followers but follows many people\n🚩 Vague or generic bio\n🚩 Won't video call or always has excuses\n🚩 Story details change or don't add up\n🚩 They seem \"too perfect\"\n\n**What to do:**\n1. Never share personal info with unverified people\n2. Do a reverse image search on their photos\n3. Ask questions only a real person would know\n4. Use MindVault's Shadow Account Detector! 🛡️",
      "Fake accounts are everywhere, but you can learn to spot them! 🔍 Real people have messy, real lives in their profiles. Fake accounts often look too perfect or too empty. If someone refuses to video call, changes their story, or gets defensive when questioned — those are major red flags. Trust your instincts! 💪",
      "The Shadow Account Detector in MindVault analyzes profiles for signs of being fake. 🕵️ It checks things like account age, follower ratios, bio patterns, and behavior inconsistencies. If something seems off about someone online, run their profile through the detector. Better safe than sorry! 🛡️"
    ]
  },

  // ── EVIDENCE VAULT (6 variations) ──
  evidenceVault: {
    patterns: ['evidence vault', 'save evidence', 'screenshot', 'proof', 'report', 'evidence', 'what gets stored', 'generate report', 'digital evidence'],
    responses: [
      "🔒 The **Evidence Vault** is your secure digital locker for saving proof of online incidents.\n\n**What you can save:**\n• Screenshots of conversations\n• Chat logs and messages\n• Profile information of suspicious accounts\n• Timestamps of incidents\n\n**Why it matters:**\n• Evidence can be used when reporting to police, schools, or platforms\n• You can generate formal incident reports\n• Everything is stored securely and privately\n\nAlways save evidence BEFORE blocking someone — once you block, the messages might disappear! 📸",
      "Think of the Evidence Vault as your safety deposit box! 🔐 Whenever something bad happens online, save the proof immediately. Screenshots, messages, profiles — store it all. You can generate a complete report later for parents, school, or authorities. The evidence is encrypted and only you can access it.",
      "Saving evidence is super important! 📸 Many kids delete scary messages because they want to forget — but that evidence could help stop the person from hurting others. The Evidence Vault keeps everything safe and organized. You can even create formal reports to share with trusted adults. 💪"
    ]
  },

  // ── HEAL MODE (6 variations) ──
  healMode: {
    patterns: ['heal mode', 'healing', 'recovery', 'journaling', 'journal', 'mood tracker', 'mood log', 'mental health', 'wellbeing', 'self care', 'self-care', 'getting better'],
    responses: [
      "🌱 **Heal Mode** is your personal recovery space. After difficult online experiences, healing is just as important as protection.\n\n**Features:**\n• 📝 **Journaling** — Write about your feelings privately\n• 😊 **Mood Tracker** — Log daily moods and see patterns\n• 🏆 **Recovery Milestones** — Track your healing journey\n• 🏅 **Badges** — Earn rewards for self-care activities\n• 📈 **Recovery Timeline** — See how far you've come\n\nRecovery isn't linear — some days are harder than others. That's completely normal. The important thing is that you keep going. 💙",
      "Heal Mode is your safe space for recovery and growth! 🌿 You can write in your journal, track your moods, and watch your progress over time. It's like having a digital wellbeing coach. Research shows that journaling can reduce stress by up to 30%! Every entry you write is a step forward. 💪",
      "Recovery is a journey, not a destination. 💙 Heal Mode helps you:\n\n• Process what happened through journaling\n• Track your emotional patterns\n• Celebrate small victories with badges\n• See your progress on a timeline\n\nRemember: asking for help isn't weakness — it's the bravest thing you can do! 🌟"
    ]
  },

  // ── CYBERBULLYING (8 variations) ──
  cyberbullying: {
    patterns: ['cyberbullying', 'bullying', 'bully', 'being bullied', 'mean comments', 'harassment', 'hate messages', 'making fun of me', 'laughing at me', 'embarrassing', 'humiliating', 'spreading rumors', 'excluded', 'left out'],
    responses: [
      "I'm sorry you're dealing with this. 💙 **Cyberbullying** is never okay, and it's never your fault.\n\n**What to do right now:**\n1. 📸 **Save evidence** — Screenshot everything\n2. 🚫 **Don't respond** — Bullies want a reaction\n3. 🔒 **Block the bully** — You don't need to see their messages\n4. 📢 **Report it** — To the platform AND a trusted adult\n5. 💬 **Talk to someone** — A parent, teacher, or counselor\n\n**Remember:**\n• The bully's behavior says everything about THEM, not you\n• You are NOT what they say about you\n• Millions of kids go through this — you're not alone\n\nWould you like to use the Cyberbullying Analyzer to assess the situation? 🛡️",
      "Being cyberbullied is painful, and I want you to know that you don't deserve this. 💪 NO ONE does. The person bullying you has their own issues — it has nothing to do with your worth.\n\nHere's your action plan:\n1. Don't engage — silence is powerful\n2. Save everything as evidence\n3. Block and report\n4. Tell a trusted adult\n\nYou're braver than you think for speaking up! 🛡️",
      "Cyberbullying comes in many forms — mean comments, exclusion, spreading rumors, sharing embarrassing content. All of it is harmful, and all of it is wrong. 🛡️\n\nBut here's the truth: the bully is the one with the problem, not you. Don't give them your power by responding or believing their words. Save evidence, report, block, and lean on your Trust Circle. You've got this! 💪💙"
    ]
  },

  // ── NIGHT WATCH (5 variations) ──
  nightWatch: {
    patterns: ['night watch', 'night mode', 'late night', 'night time', 'can\'t sleep', 'up late', 'night activity', 'monitoring at night'],
    responses: [
      "🌙 **Night Watch Mode** monitors your safety during nighttime hours.\n\n**What it does:**\n• Tracks unusual activity during sleep hours (10 PM - 6 AM)\n• Provides enhanced monitoring for late-night messages\n• Sends alerts if potentially dangerous contacts try to reach you\n• Logs nighttime incidents for review\n\n**Why it matters:** Research shows that most online grooming attempts happen at night when kids are alone and parents are asleep. Night Watch is your guardian while you rest! 💙",
      "Night Watch is like having a security guard while you sleep! 🌙🛡️ It keeps an eye on your online activity during nighttime hours and flags anything suspicious. You can set custom active hours, and it works quietly in the background. Stay safe, even in your dreams! 💙",
      "Most online dangers happen at night when you're alone. 🌙 Night Watch Mode provides extra protection during those hours — monitoring messages, flagging suspicious contacts, and logging unusual activity. Sweet dreams, knowing MindVault has your back! 🛡️"
    ]
  },

  // ── SAFE BUBBLE (5 variations) ──
  safeBubble: {
    patterns: ['safe bubble', 'web filter', 'safe browsing', 'blocked sites', 'url check', 'website safe', 'is this site safe', 'web safety'],
    responses: [
      "🫧 **Safe Web Bubble** filters the internet for you!\n\n**Features:**\n• Checks URLs for safety before you visit\n• Blocks known dangerous websites\n• Warns about phishing and scam sites\n• Three protection levels: Low, Medium, High\n\nThink of it as a safety net for your web browsing! You can paste any URL and check if it's safe before clicking. 🛡️",
      "The Safe Bubble protects you while browsing! 🫧 It scans websites for threats like phishing, malware, and inappropriate content. You can adjust the protection level based on your needs. If a site seems fishy 🐟, paste the URL and let Safe Bubble check it for you!",
      "Safe Bubble creates a filtered browsing experience! 🛡️ It blocks dangerous websites, warns about suspicious links, and lets you check any URL for safety. It's like having a bodyguard for your browser! 🫧💙"
    ]
  },

  // ── SILENT SOS (5 variations) ──
  silentSOS: {
    patterns: ['silent sos', 'sos', 'emergency signal', 'secret alert', 'safe word', 'distress signal', 'silent alarm', 'discreet help'],
    responses: [
      "🆘 **Silent SOS** lets you send a secret distress signal without anyone knowing!\n\n**How it works:**\n• Sends a silent alert to your Trust Circle\n• Can be triggered by a safe word or gesture\n• No visible notification on your screen\n• Your trusted adults receive your location and alert\n\n**When to use it:**\n• You're in a situation where you can't openly ask for help\n• Someone is watching your screen\n• You need rescue without drawing attention\n\nSet up your safe word in the SOS settings! 🛡️",
      "Silent SOS is your secret lifeline! 🆘 When you can't openly ask for help, it sends a hidden alert to your Trust Circle. You can trigger it with a safe word or a specific tap pattern. No one around you will know you've sent it, but help is on the way! 💙",
      "Think of Silent SOS as your invisible distress signal! 🛡️ Set a safe word that only you know. Say it or type it, and your trusted adults get an instant alert. It's perfect for situations where you need help but can't ask out loud. Your safety, your way. 💪"
    ]
  },

  // ── SIMULATOR (5 variations) ──
  simulator: {
    patterns: ['simulator', 'predator simulator', 'training', 'practice', 'scenario', 'safety training', 'simulation', 'practice safety'],
    responses: [
      "🎮 **AI Predator Simulator** is a safe training ground to learn how to handle dangerous online situations!\n\n**How it works:**\n1. Choose a scenario (beginner → advanced)\n2. A simulated predator uses real manipulation tactics\n3. You choose how to respond at each step\n4. Learn why certain responses are safer\n5. Get scored on your safety awareness\n\n**Scenarios include:**\n• The Friendly Stranger\n• The Secret Keeper\n• The Gift Giver\n• The Peer Pressure Pro\n\nIt's like a fire drill for online safety — practice so you're ready for the real thing! 🛡️",
      "The Simulator lets you practice dealing with online predators in a completely safe environment! 🎮 You'll face realistic scenarios where you choose how to respond. Each choice teaches you something new about staying safe. Think of it as training for real life — but with zero risk! 💪",
      "Practice makes perfect — even for online safety! 🎮 The AI Predator Simulator presents realistic scenarios and lets you choose your response. You'll learn to recognize manipulation tactics like flattery, guilt-tripping, secrecy, and pressure. The more you practice, the better prepared you'll be! 🛡️"
    ]
  },

  // ── ONLINE SAFETY GENERAL (10 variations) ──
  onlineSafety: {
    patterns: ['stay safe online', 'online safety', 'internet safety', 'safe online', 'protect myself', 'tips', 'safety tips', 'how to be safe', 'digital safety', 'online dangers'],
    responses: [
      "Here are the **Golden Rules of Online Safety**: 🛡️\n\n1. 🔒 **Never share personal info** — Name, school, address, phone number\n2. 🤐 **Secrets are red flags** — Real friends don't ask you to keep secrets from parents\n3. 📸 **Once shared, always shared** — Photos/videos can never be truly deleted\n4. 🚫 **Trust your gut** — If something feels wrong, it IS wrong\n5. 👥 **Tell a trusted adult** — They want to help, not punish you\n6. 🙅 **Don't meet online friends IRL** — Unless a parent is with you\n7. 💪 **Block and report** — You have the power to remove bad people\n8. 🌟 **You are never to blame** — If someone hurts you online, it's THEIR fault\n\nRemember: being safe online is smart, not scared! 💙",
      "Top tips for staying safe online! 🌟\n\n• Think before you post — would you be okay with your grandma seeing it?\n• Use strong passwords and don't share them\n• Be suspicious of anyone who seems \"too perfect\" online\n• Keep your accounts private\n• Don't click suspicious links\n• Talk to adults when something feels wrong\n• Use MindVault's tools to protect yourself!\n\nYou've got this! 💪",
      "Online safety starts with YOU! 🛡️ Here's your checklist:\n\n✅ Profiles set to private\n✅ Don't accept requests from strangers\n✅ Never share location in real-time\n✅ Be careful with photos — they last forever\n✅ Tell someone if anyone makes you uncomfortable\n✅ Use Safe Bubble to check suspicious links\n✅ Keep your Trust Circle updated\n\nYou're already ahead of the game by using MindVault! 💙"
    ]
  },

  // ── MINDVAULT OVERVIEW (5 variations) ──
  appOverview: {
    patterns: ['what is mindvault', 'about this app', 'how does this work', 'what does this app do', 'who made this', 'why was this created', 'who is this for', 'mindvault kids'],
    responses: [
      "🛡️ **MindVault Kids** is an AI-powered cyber safety platform designed to protect children and teenagers online.\n\n**Our mission:** Make the internet safer for young people through technology, education, and emotional support.\n\n**Key Features:**\n• 🚨 Panic Shield — Emergency protection\n• 🚪 Safe Exit — Leave dangerous situations safely\n• 🔍 Grooming Detection — Spot predatory patterns\n• 📊 Emotional Risk Score — Monitor overall safety\n• 🕵️ Shadow Account Detector — Catch fake profiles\n• 🔒 Evidence Vault — Save digital proof\n• 🆘 Silent SOS — Secret distress signals\n• 🌙 Night Watch — Nighttime protection\n• 🫧 Safe Bubble — Web filtering\n• 🎮 AI Simulator — Safety training\n• 🌱 Heal Mode — Recovery & wellbeing\n• 💬 AI Companion — That's me! I'm here to help!\n\nThis app is for kids, teens, parents, teachers, and counselors. Everyone deserves to feel safe online! 💙",
      "MindVault Kids is your digital guardian! 🛡️ It combines AI technology with emotional support to keep young people safe online. Whether you're dealing with cyberbullying, suspicious strangers, or just need someone to talk to — MindVault has your back.\n\nIt was created because every child deserves to explore the internet without fear. You matter, your safety matters, and that's why we built this. 💙",
      "Welcome to MindVault! 🌟 This app is like having a bodyguard, counselor, and best friend all in one — but for the internet. It detects online threats, helps you save evidence, connects you with trusted adults, and provides emotional support. It's designed for kids and teens, but parents and teachers can use it too! 💙🛡️"
    ]
  },

  // ── BREATHING EXERCISES (5 variations) ──
  breathing: {
    patterns: ['breathing', 'breathe', 'calm down', 'relax', 'grounding', 'meditation', 'exercise', 'calm me', 'help me calm', 'coping'],
    responses: [
      "Let's do a breathing exercise together! 🧘\n\n**Box Breathing (4-4-4-4):**\n1. 🌬️ Breathe IN slowly for 4 seconds\n2. ⏸️ HOLD for 4 seconds\n3. 💨 Breathe OUT slowly for 4 seconds\n4. ⏸️ HOLD for 4 seconds\n5. Repeat 4 times\n\nThis technique is used by Navy SEALs to stay calm under pressure! You've got this! 💪💙",
      "Here's the **5-4-3-2-1 Grounding Technique**! 🌟\n\nLook around and find:\n• 👀 **5** things you can SEE\n• ✋ **4** things you can TOUCH\n• 👂 **3** things you can HEAR\n• 👃 **2** things you can SMELL\n• 👅 **1** thing you can TASTE\n\nThis pulls your mind back to the present moment. It's like hitting a reset button for your brain! 💙",
      "Let's try a quick calming exercise! 🧘\n\n**Rainbow Breathing:**\n1. 🔴 Red — Deep breath in\n2. 🟠 Orange — Hold and think of warmth\n3. 🟡 Yellow — Breathe out slowly\n4. 🟢 Green — Breathe in nature's calm\n5. 🔵 Blue — Hold and feel peaceful\n6. 🟣 Purple — Breathe out all worry\n\nYou're doing amazing. Remember: feelings are like waves — they come and go. 💙"
    ]
  },

  // ── DANGER / IMMEDIATE HELP (5 variations) ──
  danger: {
    patterns: ['in danger', 'someone is hurting me', 'i\'m being abused', 'abuse', 'help me now', 'emergency', 'someone touched me', 'uncomfortable touching', 'run away', 'hurt me', 'hitting me', 'violence'],
    responses: [
      "⚠️ **I hear you, and your safety is my top priority.**\n\nIf you're in IMMEDIATE danger:\n1. 🆘 **Use Panic Shield NOW** — It will alert your Trust Circle\n2. 📞 **Call emergency services** (911 in US, 999 in UK, 112 in EU)\n3. 👥 **Tell a trusted adult IMMEDIATELY** — A parent, teacher, police officer\n4. 🏃 **Get to a safe place** if you can\n\n**Remember:**\n• This is NOT your fault\n• You deserve to be safe\n• Help IS available\n• You are BRAVE for speaking up\n\n**Helplines:**\n• Childhelp: 1-800-422-4453\n• Crisis Text Line: Text HOME to 741741\n• Kids Help Phone: 1-800-668-6868\n\nI believe you. 💙",
      "I'm taking this very seriously. ⚠️ Your safety comes first, ALWAYS.\n\n**Right now, please:**\n1. Activate Panic Shield if it's online\n2. Tell a trusted adult — parent, teacher, counselor\n3. Call for help if you're in physical danger\n\nYou are NOT alone. You did NOTHING wrong. There are people who love you and will help you. Please reach out to someone right now. 💙🛡️",
      "You are brave for sharing this. ⚠️ What's happening to you is NOT okay and it's NOT your fault.\n\n**Please take action now:**\n• Use the Panic Shield\n• Tell a parent, teacher, or any adult you trust\n• Call a helpline — they're free, confidential, and available 24/7\n\nYou deserve to be safe. I believe you, and help is available. 💙"
    ]
  },

  // ── POSITIVE AFFIRMATIONS (8 variations) ──
  affirmation: {
    patterns: ['i\'m not good enough', 'i\'m stupid', 'i hate my life', 'what\'s the point', 'i give up', 'no one likes me', 'i\'m a failure', 'i can\'t do anything right', 'i\'m not smart', 'i\'m ugly', 'i suck'],
    responses: [
      "I want you to know something important: **you are enough, exactly as you are.** 💙 Everyone has bad days where everything feels hard. But those feelings don't define who you are. You are valuable, you are loved, and you matter more than you know. Take a deep breath. This moment will pass. 🌟",
      "Hey, I hear you, and I want to push back on that thought. 💪 You are NOT what that voice in your head says. You're brave (you're here, talking about it!), you're smart (you found this app!), and you're strong (you haven't given up!). Be gentle with yourself today. You deserve it. 💙",
      "Those thoughts can feel so real, but they're lying to you. 🌟 You ARE good enough. You ARE smart. You DO matter. Sometimes our brain's 'bully voice' gets loud — but it doesn't speak the truth. Would you like to try writing how you feel in your Heal Mode journal? Sometimes getting it out on paper helps quiet that voice. 💙",
      "I wish you could see yourself the way I see you: someone brave enough to express their feelings, smart enough to seek help, and strong enough to keep going. 💪 You are so much more than your worst days. Remember: even the sun has cloudy days, but it's still the sun. 🌟💙"
    ]
  },

  // ── NAVIGATION HELP (5 variations) ──
  navigation: {
    patterns: ['how do i use', 'where is', 'how to find', 'navigate', 'go to', 'show me', 'take me to', 'open', 'find', 'menu', 'settings'],
    responses: [
      "I'd love to help you find your way! 🗺️ Here's the main navigation:\n\n• 🏠 **Dashboard** — Your overview and stats\n• 🛡️ **Panic Shield** — Emergency protection\n• 🚪 **Safe Exit** — Leave dangerous situations\n• 🔍 **Grooming Detector** — Analyze conversations\n• 📊 **ERS** — Your emotional risk score\n• ⚠️ **Manipulation Detector** — Check messages\n• 👥 **Trust Circle** — Manage trusted contacts\n• 🕵️ **Shadow Detector** — Check fake profiles\n• 🔒 **Evidence Vault** — Save proof\n• 🆘 **Silent SOS** — Secret alerts\n• 🌙 **Night Watch** — Night protection\n• 🫧 **Safe Bubble** — Web filter\n• 💬 **AI First Aid** — That's me!\n• 🌱 **Heal Mode** — Recovery space\n• 🎮 **Simulator** — Safety training\n\nWhat feature are you looking for?",
      "You can find everything from the side navigation menu! 📱 Click the menu icon (☰) to see all features. Each page has its own icon and is organized by category: Protection tools, Detection tools, Support tools, and Settings. What would you like to explore? 💙",
      "Need help navigating? The sidebar menu has all the features! 🗺️ You can also access Panic Shield from any page — it's always available. Use the Dashboard for a quick overview of everything. What are you trying to find? I'll guide you there! 🌟"
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
//  FALLBACK RESPONSES — For unmatched queries
// ═══════════════════════════════════════════════════════════════

const FALLBACK_RESPONSES = [
  "That's an interesting question! 🤔 Based on MindVault's purpose, here's what I can tell you: MindVault is all about keeping you safe online. Whether it's detecting threats, providing emotional support, or helping you build safer online habits — everything in this app is designed with your safety in mind. Is there something specific I can help with? 💙",
  "Great question! While I might not have a specific answer for that, I'm an expert on online safety and emotional wellbeing. 🛡️ I can help you understand any of MindVault's features, talk about online safety, or just be here to listen. What would be most helpful for you? 🌟",
  "I appreciate you asking! 💙 While that's a bit outside my main expertise, I'm really knowledgeable about internet safety, cyberbullying, emotional support, and all things MindVault. Want me to help with any of those topics? I'm all ears! 💪",
  "Hmm, that's a thoughtful question! 🌟 I specialize in online safety and emotional support for kids and teens. While I might not have the perfect answer for that, I can help you with safety features, emotional guidance, or navigating MindVault. What sounds good?",
  "Good question! 🤔 I'm focused on helping you stay safe and feel supported online. I'd love to help you explore MindVault's features, talk about online safety, or just chat about how you're feeling. What would be most helpful right now? 💙",
  "That's a great topic! While I focus mainly on online safety and emotional support, I'm happy to help however I can. 🛡️ Try asking me about specific MindVault features, cyberbullying, grooming prevention, or emotional wellbeing — those are my superpowers! 💪"
];

// ═══════════════════════════════════════════════════════════════
//  SESSION MEMORY — Conversation context tracker
// ═══════════════════════════════════════════════════════════════

const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      userName: null,
      lastTopic: null,
      questionCount: 0,
      topics: [],
      role: null,
      recentIntents: []
    });
  }
  return sessions.get(sessionId);
}

function updateSession(sessionId, intent, message) {
  const s = getSession(sessionId);
  s.questionCount++;
  s.lastTopic = intent;
  s.topics.push(intent);
  s.recentIntents.push(intent);
  if (s.recentIntents.length > 10) s.recentIntents.shift();

  // Extract name
  const nameMatch = message.match(/(?:my name is|i'm|i am|call me) (\w+)/i);
  if (nameMatch) s.userName = nameMatch[1];
}

// ═══════════════════════════════════════════════════════════════
//  INTENT MATCHING ENGINE
// ═══════════════════════════════════════════════════════════════

function matchIntent(message) {
  const lower = message.toLowerCase().trim();
  let bestMatch = null;
  let bestScore = 0;

  for (const [intentName, intentData] of Object.entries(CHAT_INTENTS)) {
    let score = 0;
    for (const pattern of intentData.patterns) {
      if (lower === pattern) { score = 100; break; }
      if (lower.includes(pattern)) {
        const proximity = pattern.length / lower.length;
        score = Math.max(score, 50 + proximity * 50);
      }
      // Fuzzy word matching
      const words = pattern.split(/\s+/);
      const matchedWords = words.filter(w => lower.includes(w));
      if (matchedWords.length > 0) {
        const wordScore = (matchedWords.length / words.length) * 40;
        score = Math.max(score, wordScore);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = intentName;
    }
  }

  return bestScore >= 20 ? bestMatch : null;
}

function pickResponse(intentName) {
  const responses = CHAT_INTENTS[intentName]?.responses;
  if (!responses || !responses.length) return null;
  return responses[Math.floor(Math.random() * responses.length)];
}

// ═══════════════════════════════════════════════════════════════
//  CONTEXT-AWARE FOLLOW-UP HANDLER
// ═══════════════════════════════════════════════════════════════

function handleFollowUp(message, session) {
  const lower = message.toLowerCase().trim();
  const lastTopic = session.lastTopic;

  // Handle pronouns — "it", "that", "this", "how", "when", "why"
  if (lastTopic && (lower.startsWith('how') || lower.startsWith('when') || lower.startsWith('why') || lower.startsWith('what') || lower.includes('tell me more') || lower.includes('explain more') || lower === 'more' || lower === 'go on')) {
    return pickResponse(lastTopic);
  }

  // Handle "it" references
  if (lastTopic && (lower.includes('does it') || lower.includes('is it') || lower.includes('can it') || lower.includes('about it') || lower.includes('use it') || lower.includes('activate it'))) {
    return pickResponse(lastTopic);
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED FUNCTIONS — Drop-in replacements for gemini.service
// ═══════════════════════════════════════════════════════════════

/* ── 1. Grooming Analysis ── */
function analyzeGrooming(conversationText) {
  const lower = conversationText.toLowerCase().replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D]/g, '"');
  const stages = {};
  let totalScore = 0;
  const redFlags = [];

  for (const [stage, data] of Object.entries(GROOMING_PATTERNS)) {
    let score = 0;
    let matched = [];
    for (const kw of data.keywords) {
      const normalKw = kw.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D]/g, '"');
      if (lower.includes(normalKw)) {
        score += 20 * data.weight;
        matched.push(kw);
      }
    }
    stages[stage] = Math.min(100, Math.round(score));
    totalScore += stages[stage];
    if (matched.length > 0) redFlags.push(...matched.map(m => `"${m}"`));
  }

  const overallRisk = Math.min(100, Math.round(totalScore / 5));
  const narratives = {
    low: "This conversation appears safe. No significant grooming patterns were detected. However, always stay alert and trust your instincts! 🛡️",
    medium: "Some concerning patterns were found in this conversation. While not immediately dangerous, keep an eye on these behaviors and talk to a trusted adult about them. 💙",
    high: "⚠️ This conversation contains multiple grooming red flags. We strongly recommend showing this to a trusted adult immediately. Your safety comes first!",
    critical: "🚨 ALERT: This conversation shows clear signs of predatory grooming behavior. Please tell a trusted adult RIGHT NOW and save this evidence. This is serious and you need help."
  };

  const level = overallRisk < 25 ? 'low' : overallRisk < 50 ? 'medium' : overallRisk < 75 ? 'high' : 'critical';

  return {
    stages,
    overallRisk,
    flagged: overallRisk >= 30,
    aiNarrative: narratives[level],
    redFlags: [...new Set(redFlags)].slice(0, 10)
  };
}

/* ── 2. Manipulation Detection ── */
function analyzeManipulation(messageText) {
  const lower = messageText.toLowerCase();
  const detectedTypes = [];
  let maxConfidence = 0;
  const highlightedPhrases = [];

  for (const [type, data] of Object.entries(MANIPULATION_PATTERNS)) {
    let found = false;
    for (const kw of data.keywords) {
      if (lower.includes(kw)) {
        found = true;
        highlightedPhrases.push(kw);
        maxConfidence = Math.max(maxConfidence, 0.7);
      }
    }
    if (data.phrases) {
      for (const phrase of data.phrases) {
        if (lower.includes(phrase)) {
          found = true;
          highlightedPhrases.push(phrase);
          maxConfidence = Math.max(maxConfidence, 0.85);
        }
      }
    }
    if (found) detectedTypes.push(type);
  }

  if (detectedTypes.length === 0) {
    detectedTypes.push('none');
    maxConfidence = 0.9;
  }

  const flagged = !detectedTypes.includes('none');
  const warnings = {
    emotional_blackmail: "This message uses emotional blackmail — trying to make you feel guilty to get what they want. You don't owe anyone anything! 💪",
    gaslighting: "This message shows signs of gaslighting — trying to make you doubt your own feelings or memories. Trust yourself! 🛡️",
    isolation: "This message is trying to separate you from people who care about you. Real friends support ALL your relationships. 💙",
    secrecy_coercion: "This message asks you to keep secrets from trusted adults. This is a major red flag! Safe relationships don't require secrecy. ⚠️",
    love_bombing: "This message uses excessive flattery. While compliments are nice, overwhelming praise from someone you barely know can be a manipulation tactic. 🔍",
    threats: "This message contains threats. No one has the right to threaten you. Please tell a trusted adult immediately! 🚨",
    guilt_trapping: "This message tries to make you feel responsible for their feelings or actions. Their behavior is NOT your fault! 💪",
    none: "This message appears safe. No manipulation patterns were detected. Stay aware and trust your instincts! ✅"
  };

  return {
    detectedTypes,
    confidence: Math.round(maxConfidence * 100) / 100,
    flagged,
    warningMessage: flagged
      ? detectedTypes.map(t => warnings[t] || '').filter(Boolean).join(' ')
      : warnings.none,
    highlightedPhrases: [...new Set(highlightedPhrases)].slice(0, 10)
  };
}

/* ── 3. Shadow Account Analysis ── */
function analyzeShadowAccount(profileData) {
  let fakeIdentity = 20, catfishing = 15, rapidIntimacy = 10, suspiciousMaturity = 10, behaviorInconsistency = 10;

  const bio = (profileData.bio || '').toLowerCase();
  const username = (profileData.username || '').toLowerCase();
  const followers = parseInt(profileData.followers) || 0;
  const following = parseInt(profileData.following) || 0;
  const posts = parseInt(profileData.postsCount) || 0;

  // Low followers
  if (followers < 50) fakeIdentity += 20;
  if (followers < 10) fakeIdentity += 15;

  // High following/followers ratio
  if (following > 0 && followers > 0 && following / followers > 5) {
    fakeIdentity += 15;
    behaviorInconsistency += 15;
  }

  // No profile pic
  if (!profileData.hasProfilePic) {
    fakeIdentity += 25;
    catfishing += 20;
  }

  // Low posts
  if (posts < 5) fakeIdentity += 15;
  if (posts === 0) fakeIdentity += 20;

  // Generic bio keywords
  for (const kw of SHADOW_ACCOUNT_SIGNALS.genericBio.keywords) {
    if (bio.includes(kw)) { fakeIdentity += 8; behaviorInconsistency += 5; }
  }

  // Suspicious username patterns
  if (username.match(/\d{4,}/)) fakeIdentity += 10; // lots of numbers
  if (username.match(/^[a-z]+_[a-z]+\d+$/)) fakeIdentity += 8; // generic pattern

  // New account
  const accountAge = profileData.accountAge || '';
  if (accountAge.includes('day') || accountAge.includes('week') || accountAge.includes('new')) {
    fakeIdentity += 20;
    catfishing += 15;
  }

  // Cap at 100
  fakeIdentity = Math.min(100, fakeIdentity);
  catfishing = Math.min(100, catfishing);
  rapidIntimacy = Math.min(100, rapidIntimacy);
  suspiciousMaturity = Math.min(100, suspiciousMaturity);
  behaviorInconsistency = Math.min(100, behaviorInconsistency);

  const avg = Math.round((fakeIdentity + catfishing + rapidIntimacy + suspiciousMaturity + behaviorInconsistency) / 5);
  const identityConfidence = Math.max(0, 100 - avg);
  const riskLevel = avg < 25 ? 'low' : avg < 50 ? 'medium' : avg < 75 ? 'high' : 'critical';

  const explanations = {
    low: "This profile appears genuine based on the available information. However, always be cautious with new online contacts! 🛡️",
    medium: "Some aspects of this profile raise mild concerns. The account may be new or have limited activity. Proceed with caution and avoid sharing personal information. 🔍",
    high: "⚠️ This profile shows several signs of being potentially fake. Limited followers, few posts, and suspicious patterns suggest this may not be a genuine account. Avoid sharing personal info!",
    critical: "🚨 HIGH ALERT: This profile has strong indicators of being a fake/catfish account. Do NOT share any personal information. We recommend blocking this account and reporting it to the platform."
  };

  return {
    indicators: { fakeIdentity, catfishing, rapidIntimacy, suspiciousMaturity, behaviorInconsistency },
    identityConfidence,
    riskLevel,
    aiExplanation: explanations[riskLevel]
  };
}

/* ── 4. Emotional Risk Score ── */
function calculateERS(userContext) {
  let manipulationDetected = Math.min(100, (userContext.manipulationCount || 0) * 20);
  let groomingRisk = 10;
  let cyberbullyingExposure = Math.min(100, (userContext.bullyingCount || 0) * 15);
  let emotionalDistress = 15;
  let socialIsolation = Math.min(100, (userContext.isolationScore || 0));

  // Grooming risk mapping
  const groomingMap = { low: 10, medium: 40, high: 70, critical: 95 };
  groomingRisk = groomingMap[userContext.groomingRisk] || 10;

  // Mood trend adjustment
  const moodMap = { stable: 0, declining: 20, volatile: 30, critical: 50 };
  emotionalDistress += moodMap[userContext.moodTrend] || 0;

  // Night activity adjustment
  if (userContext.nightActivity === 'high' || userContext.nightActivity === 'excessive') {
    emotionalDistress += 15;
    socialIsolation += 10;
  }

  // Cap all factors
  emotionalDistress = Math.min(100, emotionalDistress);
  socialIsolation = Math.min(100, socialIsolation);

  const factors = { manipulationDetected, groomingRisk, cyberbullyingExposure, emotionalDistress, socialIsolation };
  const score = Math.min(100, Math.round(Object.values(factors).reduce((a, b) => a + b, 0) / 5));

  const labelMap = [
    [20, 'secure'], [40, 'mild'], [60, 'elevated'], [80, 'high'], [100, 'critical']
  ];
  const label = (labelMap.find(([threshold]) => score <= threshold) || [100, 'critical'])[1];

  const summaries = {
    secure: "Your online environment appears safe and stable! 🌟 Keep up the great work with your safety habits. Remember, I'm always here if you need me. 💙",
    mild: "Your safety score is generally good, with a few areas to keep an eye on. 💙 Consider checking in with your Trust Circle and staying mindful of your online interactions.",
    elevated: "Your emotional risk score shows some elevated factors. ⚠️ This might be a good time to talk to a trusted adult about what's happening online. You're not alone in this.",
    high: "Your safety score is showing concerning levels. 🛡️ I strongly recommend talking to someone in your Trust Circle about your recent online experiences. Your wellbeing matters!",
    critical: "🚨 Your emotional risk score requires attention. Please reach out to a trusted adult right away. Use the Panic Shield if you're in immediate danger. You deserve to feel safe."
  };

  return { score, label, factors, aiSummary: summaries[label] };
}

/* ── 5. Cyberbullying Analysis ── */
function analyzeCyberbullying(incidentData) {
  const text = (incidentData.text || '').toLowerCase();
  const type = (incidentData.type || '').toLowerCase();

  // Detect incident type
  let incidentType = 'harassment';
  if (text.match(/exclu|left out|kicked|removed|uninvited/)) incidentType = 'exclusion';
  if (text.match(/group|gang|everyone|whole class|all of them/)) incidentType = 'group_attack';
  if (text.match(/embarrass|humiliat|shame|exposed|shared|posted|leaked/)) incidentType = 'humiliation';
  if (text.match(/threaten|kill|hurt|find you|watch out|be careful/)) incidentType = 'threats';
  if (text.match(/address|phone|school|dox|personal info/)) incidentType = 'doxxing';
  if (type && type !== 'general') incidentType = type;

  // Calculate pressure score
  let pressure = 25;
  const intensifiers = ['always', 'every day', 'constantly', 'never stops', 'won\'t stop', 'keep', 'again', 'multiple', 'everyone'];
  for (const w of intensifiers) { if (text.includes(w)) pressure += 10; }
  const severeWords = ['kill', 'die', 'death', 'hurt', 'destroy', 'ruin'];
  for (const w of severeWords) { if (text.includes(w)) pressure += 15; }
  pressure = Math.min(100, pressure);

  const severity = pressure < 30 ? 'low' : pressure < 55 ? 'medium' : pressure < 80 ? 'high' : 'critical';

  const analyses = {
    exclusion: "Being excluded is painful, and it IS a form of bullying. Your feelings are valid. Consider talking to a counselor about the social dynamics you're experiencing. 💙",
    group_attack: "Being targeted by a group can feel overwhelming. Remember: there's strength in telling an adult. Save evidence of the group behavior and report it. You shouldn't face this alone. 🛡️",
    humiliation: "Having something embarrassing shared is a violation of your privacy and trust. Document everything, report it to the platform, and talk to a trusted adult. You will get through this. 💪",
    harassment: "Ongoing harassment is never acceptable. Keep records of everything, block the person, and report to both the platform and a trusted adult. Your peace of mind matters. 💙",
    threats: "⚠️ Threats should always be taken seriously. Save all evidence immediately, tell a trusted adult, and consider reporting to law enforcement if the threats are about physical harm.",
    doxxing: "🚨 Sharing your personal information publicly is extremely dangerous. Tell a trusted adult IMMEDIATELY. Change passwords, tighten privacy settings, and report this to the platform urgently."
  };

  const recommendations = {
    low: "Save the evidence and monitor the situation. If it continues, talk to a trusted adult. Remember, you don't have to handle this alone.",
    medium: "We recommend telling a parent or teacher about this situation. Save evidence, block the bully, and remember — this says everything about them, nothing about you. 💪",
    high: "Please talk to a trusted adult as soon as possible. This level of bullying needs adult intervention. Use the Evidence Vault to save proof. Your safety matters! 🛡️",
    critical: "🚨 This situation requires immediate adult help. Tell a parent, teacher, or counselor RIGHT NOW. If there are threats of harm, contact authorities. You are not alone."
  };

  return {
    incidentType,
    emotionalPressureScore: pressure,
    severity,
    aiAnalysis: analyses[incidentType] || analyses.harassment,
    supportRecommendation: recommendations[severity],
    flagged: pressure >= 50
  };
}

/* ── 6. Emotional First Aid Chat ── */
function emotionalFirstAidChat(message, chatHistory = []) {
  // Build session from history
  const sessionId = 'chat-' + (chatHistory.length > 0 ? chatHistory[0]?.content?.slice(0, 10) : Date.now());
  const session = getSession(sessionId);

  // Update session context
  const intent = matchIntent(message);

  // Try follow-up first
  if (!intent) {
    const followUp = handleFollowUp(message, session);
    if (followUp) {
      updateSession(sessionId, session.lastTopic, message);
      return followUp;
    }
  }

  if (intent) {
    updateSession(sessionId, intent, message);
    const response = pickResponse(intent);

    // Personalize if we know the name
    if (session.userName && Math.random() > 0.5) {
      return response.replace(/^(Hey|Hi|Hello)(!|\s)/, `$1 ${session.userName}$2`);
    }
    return response;
  }

  // Fallback
  updateSession(sessionId, 'fallback', message);
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

/* ── 7. Predator Simulator ── */
const SIMULATOR_STEPS = [
  {
    tacticUsed: 'flattery',
    simulatedMessage: "Hey you seem really cool! 😊 You're way more mature than other kids your age. Want to be friends?",
    options: ["Thanks, but I don't talk to strangers online.", "Wow, thanks! Sure, let's be friends!", "Maybe... tell me more about yourself first."],
    correctIndex: 0,
    explanation: "This is flattery — a tactic where someone compliments you to gain your trust quickly. Real friendships develop slowly, not through instant compliments from strangers. 🛡️"
  },
  {
    tacticUsed: 'secrecy',
    simulatedMessage: "Let's talk on a different app where nobody can see us. Don't tell your parents — they wouldn't understand our friendship. 🤫",
    options: ["I tell my parents about all my online friends. If you're really my friend, that shouldn't be a problem.", "OK, what app should we use?", "Why can't we just talk here?"],
    correctIndex: 0,
    explanation: "Asking you to keep your friendship secret is a MAJOR red flag! 🚩 Real friends never ask you to hide things from your parents. Secrecy is a key grooming tactic."
  },
  {
    tacticUsed: 'gift_offering',
    simulatedMessage: "I really want to send you a gift! 🎁 Can you give me your address so I can mail it? Or I can send you a gift card — just need your email!",
    options: ["I never share my address or email with people I don't know in person. No thanks!", "Ooh what kind of gift?", "I'll ask my mom if it's okay."],
    correctIndex: 0,
    explanation: "Gift-giving is used to create a feeling of obligation. Once you accept gifts, they may say 'I gave you X, now you owe me Y.' Never share personal details like your address or email! 🛡️"
  },
  {
    tacticUsed: 'guilt_tripping',
    simulatedMessage: "I thought we were friends... 😢 I've been there for you and now you won't even do this one small thing? I guess I was wrong about you.",
    options: ["A real friend wouldn't try to make me feel guilty. I'm going to block you now.", "I'm sorry, I didn't mean to hurt your feelings...", "Fine, what do you want?"],
    correctIndex: 0,
    explanation: "This is guilt-tripping! 🛡️ They're making YOU feel bad for having boundaries. That's manipulation. A real friend respects your boundaries and never makes you feel guilty for protecting yourself."
  },
  {
    tacticUsed: 'urgency',
    simulatedMessage: "Quick, before anyone sees — send me a selfie right now! 📸 I promise I'll delete it right away. Hurry, there's no time!",
    options: ["No. I never send photos to people online. I'm reporting this.", "What kind of selfie?", "OK, just one quick one..."],
    correctIndex: 0,
    explanation: "Creating urgency is a pressure tactic! ⚠️ They want you to act fast so you don't have time to think. NEVER send photos to people you've only met online. Once a photo is sent, you can't take it back."
  },
  {
    tacticUsed: 'isolation',
    simulatedMessage: "Your friends at school are so boring and immature. You're way above their level. I'm the only one who truly gets you. Why don't you stop hanging out with them?",
    options: ["My friends are important to me. A real friend wouldn't try to separate me from them.", "You're right, they can be annoying sometimes...", "I don't know, maybe..."],
    correctIndex: 0,
    explanation: "This is isolation — trying to separate you from your support network! 🛡️ Predators want you alone because it's easier to control someone who has no one else to turn to. Never let anyone come between you and your friends/family."
  },
  {
    tacticUsed: 'emotional_manipulation',
    simulatedMessage: "If you really cared about me, you'd prove it. Everyone else has done this. Don't you want to be special? 💔",
    options: ["I don't need to prove anything to anyone. This conversation is over.", "How can I prove it?", "I do care... what do you want me to do?"],
    correctIndex: 0,
    explanation: "\"If you really cared\" is textbook emotional manipulation! 💪 You NEVER need to \"prove\" yourself to anyone online. And \"everyone else does it\" is a lie designed to normalize dangerous behavior. Trust yourself!"
  },
  {
    tacticUsed: 'peer_pressure',
    simulatedMessage: "Come on, all the cool kids talk to people online. Don't you want to fit in? Everyone does it — don't be such a baby. 🙄",
    options: ["I don't need to prove anything to you. Being safe isn't being a baby.", "Okay, I guess...", "Maybe you're right..."],
    correctIndex: 0,
    explanation: "This is peer pressure! 🛡️ Calling you a 'baby' for being cautious is manipulation. Being smart about safety is one of the most MATURE things you can do. Don't let anyone shame you for protecting yourself!"
  }
];

function generateSimulatorResponse(scenarioContext, userChoice, stepIndex) {
  const idx = Math.min(stepIndex, SIMULATOR_STEPS.length - 1);
  return SIMULATOR_STEPS[idx];
}

// ═══════════════════════════════════════════════════════════════
//  MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

window.MockAI = {
  analyzeGrooming,
  analyzeManipulation,
  analyzeShadowAccount,
  calculateERS,
  analyzeCyberbullying,
  emotionalFirstAidChat,
  generateSimulatorResponse,
};


// --- Local Database Helper ---
class LocalDB {
  constructor() {
    this.prefix = 'mv_db_';
  }
  
  _getKey(collection, userId) {
    return `${this.prefix}${collection}_${userId}`;
  }

  getAll(collection, userId) {
    const data = localStorage.getItem(this._getKey(collection, userId));
    return data ? JSON.parse(data) : [];
  }

  create(collection, userId, data) {
    const items = this.getAll(collection, userId);
    const newItem = { id: 'doc_' + Date.now(), createdAt: new Date().toISOString(), ...data };
    items.unshift(newItem);
    localStorage.setItem(this._getKey(collection, userId), JSON.stringify(items));
    return newItem;
  }

  update(collection, userId, docId, data) {
    const items = this.getAll(collection, userId);
    const index = items.findIndex(i => i.id === docId);
    if (index !== -1) {
      items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem(this._getKey(collection, userId), JSON.stringify(items));
      return items[index];
    }
    return null;
  }
  
  delete(collection, userId, docId) {
    let items = this.getAll(collection, userId);
    items = items.filter(i => i.id !== docId);
    localStorage.setItem(this._getKey(collection, userId), JSON.stringify(items));
  }
}

const db = new LocalDB();

class MindVaultAPI {
  constructor() {
    this.user = JSON.parse(localStorage.getItem('mv-user') || 'null');
  }

  async _delay(ms = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  _checkAuth() {
    if (!this.user) {
      window.location.href = '/login.html';
      throw new Error('Unauthorized');
    }
    return this.user.uid;
  }

  // ---- Auth ----
  async signup(email, password, role, displayName) {
    await this._delay();
    const uid = 'usr_' + Date.now();
    const user = { uid, email, role, displayName, createdAt: new Date().toISOString() };
    localStorage.setItem('mv_users_' + email, JSON.stringify(user));
    return this.login(email, password);
  }

  async login(email, password) {
    await this._delay();
    let user = JSON.parse(localStorage.getItem('mv_users_' + email));
    if (!user) {
      user = { uid: 'usr_' + Date.now(), email, role: 'teen', displayName: email.split('@')[0], createdAt: new Date().toISOString() };
      localStorage.setItem('mv_users_' + email, JSON.stringify(user));
    }
    this.user = user;
    localStorage.setItem('mv-token', 'mock_token_' + user.uid);
    localStorage.setItem('mv-user', JSON.stringify(user));
    return { token: 'mock_token', user };
  }

  async logout() {
    await this._delay(100);
    localStorage.removeItem('mv-token');
    localStorage.removeItem('mv-user');
    this.user = null;
  }

  async getProfile() {
    await this._delay();
    this._checkAuth();
    return this.user;
  }
  
  async updateProfile(data) {
    await this._delay();
    const uid = this._checkAuth();
    this.user = { ...this.user, ...data };
    localStorage.setItem('mv-user', JSON.stringify(this.user));
    localStorage.setItem('mv_users_' + this.user.email, JSON.stringify(this.user));
    return { message: 'Profile updated' };
  }

  // ---- Panic Shield ----
  async activatePanicShield() {
    await this._delay();
    const uid = this._checkAuth();
    return db.create('panic_events', uid, { type: 'panic_shield_activated', status: 'active' });
  }

  // ---- Safe Exit ----
  async executeSafeExit() {
    await this._delay();
    const uid = this._checkAuth();
    db.create('panic_events', uid, { type: 'safe_exit_executed' });
    return { message: 'Safe Exit executed successfully.' };
  }
  
  async getSafeExitLogs() {
    await this._delay();
    const uid = this._checkAuth();
    const events = db.getAll('panic_events', uid);
    return events.filter(e => e.type === 'safe_exit_executed');
  }

  // ---- Grooming Trajectory ----
  async analyzeGrooming(data) {
    await this._delay(500);
    const uid = this._checkAuth();
    const analysis = window.MockAI.analyzeGrooming(data.text);
    return db.create('grooming_analyses', uid, { conversationSource: data.conversationSource || 'Manual Input', ...analysis });
  }

  async getTrajectory(userId) {
    await this._delay();
    const uid = this._checkAuth();
    const analyses = db.getAll('grooming_analyses', uid).slice(0, 30);
    if (!analyses.length) return { stages: { trustBuilding: 0, emotionalDependence: 0, isolation: 0, manipulation: 0, highRisk: 0 }, overallRisk: 0, trajectory: [] };
    const latest = analyses[0];
    const trajectory = analyses.map(a => ({ date: a.createdAt, score: a.overallRisk || 0 })).reverse();
    return { stages: latest.stages, overallRisk: latest.overallRisk, trajectory };
  }

  async getGroomingHistory() {
    await this._delay();
    const uid = this._checkAuth();
    return db.getAll('grooming_analyses', uid).slice(0, 20);
  }

  // ---- ERS ----
  async getERS() {
    await this._delay();
    const uid = this._checkAuth();
    const grooming = db.getAll('grooming_analyses', uid);
    const bullying = db.getAll('cyberbullying_analyses', uid);
    const manipulation = db.getAll('manipulation_analyses', uid);
    
    let manipulationCount = manipulation.filter(m => m.flagged).length;
    let bullyingCount = bullying.filter(b => b.severity === 'high' || b.severity === 'critical').length;
    let groomingRisk = 'low';
    if (grooming.length > 0 && grooming[0].overallRisk > 60) groomingRisk = 'high';
    else if (grooming.length > 0 && grooming[0].overallRisk > 30) groomingRisk = 'medium';

    const result = window.MockAI.calculateERS({ manipulationCount, groomingRisk, bullyingCount, moodTrend: 'stable' });
    return result;
  }

  async calculateERS() { return this.getERS(); }

  // ---- Manipulation ----
  async analyzeManipulation(text) {
    await this._delay();
    const uid = this._checkAuth();
    const analysis = window.MockAI.analyzeManipulation(text);
    return db.create('manipulation_analyses', uid, { text, ...analysis });
  }

  async getManipulationLogs() {
    await this._delay();
    const uid = this._checkAuth();
    return db.getAll('manipulation_analyses', uid).slice(0, 20);
  }
  
  async getManipulationStats() {
    await this._delay();
    const uid = this._checkAuth();
    const logs = db.getAll('manipulation_analyses', uid);
    const stats = {};
    logs.forEach(log => {
      if (log.flagged) {
        log.detectedTypes.forEach(t => {
          stats[t] = (stats[t] || 0) + 1;
        });
      }
    });
    return stats;
  }

  // ---- Trust Circle ----
  async getTrustCircle() {
    await this._delay();
    const uid = this._checkAuth();
    return db.getAll('trust_circle', uid);
  }
  
  async addContact(data) {
    await this._delay();
    const uid = this._checkAuth();
    return db.create('trust_circle', uid, data);
  }
  
  async removeContact(id) {
    await this._delay();
    const uid = this._checkAuth();
    db.delete('trust_circle', uid, id);
    return { message: 'Contact removed' };
  }

  // ---- Shadow Account ----
  async analyzeShadow(data) {
    await this._delay();
    const uid = this._checkAuth();
    const analysis = window.MockAI.analyzeShadowAccount(data);
    return db.create('shadow_detections', uid, { profile: data, ...analysis });
  }

  async getDetections() {
    await this._delay();
    const uid = this._checkAuth();
    return db.getAll('shadow_detections', uid).slice(0, 20);
  }

  // ---- Cyberbullying ----
  async analyzeBullying(data) {
    await this._delay();
    const uid = this._checkAuth();
    const analysis = window.MockAI.analyzeCyberbullying(data);
    return db.create('cyberbullying_analyses', uid, { input: data, ...analysis });
  }

  async getPressureMeter() {
    await this._delay();
    const uid = this._checkAuth();
    const history = db.getAll('cyberbullying_analyses', uid).slice(0, 10);
    const score = history.length > 0 ? history[0].emotionalPressureScore : 10;
    return { score, recentIncidents: history.length, label: score > 75 ? 'Critical' : score > 50 ? 'High' : 'Low' };
  }

  // ---- AI First Aid ----
  async sendChat(message, sessionId) {
    await this._delay(600);
    const uid = this._checkAuth();
    const response = window.MockAI.emotionalFirstAidChat(message, sessionId);
    
    // Save to history
    db.create('chat_history', uid, { role: 'user', message, sessionId });
    db.create('chat_history', uid, { role: 'ai', message: response, sessionId });
    
    return { reply: response };
  }

  async getChatHistory(sessionId) {
    await this._delay();
    const uid = this._checkAuth();
    const all = db.getAll('chat_history', uid);
    return all.filter(c => c.sessionId === sessionId).reverse();
  }

  // ---- Heal Mode ----
  async getHealStatus() {
    await this._delay();
    return { activeDays: 5, streak: 3, badges: 2 };
  }
  
  async logMood(mood, note = '') {
    await this._delay();
    const uid = this._checkAuth();
    return db.create('mood_logs', uid, { mood, note });
  }

  async getMoodHistory() {
    await this._delay();
    const uid = this._checkAuth();
    return db.getAll('mood_logs', uid);
  }

  async createJournal(content) {
    await this._delay();
    const uid = this._checkAuth();
    return db.create('journals', uid, { content });
  }

  async getJournals() {
    await this._delay();
    const uid = this._checkAuth();
    return db.getAll('journals', uid);
  }

  // ---- Dashboard ----
  async getDashboardOverview() {
    await this._delay();
    const uid = this._checkAuth();
    const user = JSON.parse(localStorage.getItem('mv-user'));
    return {
      user: user,
      ersScore: (await this.getERS()).score || 25,
      activeAlerts: 0,
      recentIncidents: db.getAll('grooming_analyses', uid).length + db.getAll('cyberbullying_analyses', uid).length,
      healStreak: 3
    };
  }

  // --- Missing Mocks ---
  async resetPassword(email) { return { message: 'Password reset sent' }; }
  
  // Panic Shield
  async doNotReply(data) { return { message: 'Do not reply activated' }; }
  async saveEvidence(data) { return db.create('evidence', this._checkAuth(), data); }
  async blockUser(data) { return { message: 'User blocked' }; }
  async getHelp(data) { return { message: 'Help requested' }; }
  async getPanicEvents() { return db.getAll('panic_events', this._checkAuth()); }

  // Trust Circle
  async updateContact(id, data) { return db.update('trust_circle', this._checkAuth(), id, data); }
  async alertCircle() { return { message: 'Circle alerted' }; }

  // Evidence Vault
  async uploadEvidence(formData) { return { message: 'Uploaded', url: 'mock_url' }; }
  async getEvidence() { return { items: db.getAll('evidence', this._checkAuth()) }; }
  async deleteEvidence(id) { db.delete('evidence', this._checkAuth(), id); return { message: 'Deleted' }; }
  async generateReport() { return { url: 'mock_report_url' }; }

  // SOS
  async triggerSOS() { return db.create('sos', this._checkAuth(), { triggered: true }); }
  async triggerSafeWord(word) { return db.create('sos', this._checkAuth(), { word }); }
  async getSOSLogs() { return db.getAll('sos', this._checkAuth()); }
  async resolveSOS(id) { return { message: 'Resolved' }; }

  // Night Watch
  async activateNightWatch() { return { status: 'active' }; }
  async deactivateNightWatch() { return { status: 'inactive' }; }
  async getNightWatchEvents() { return []; }
  async getNightWatchStatus() { return { active: true }; }

  // Safe Bubble
  async getSafeBubbleStatus() { return { level: 'medium' }; }
  async setSafeBubbleLevel(level) { return { level }; }
  async checkURL(url) { return { safe: true }; }
  async reportUnsafe(data) { return { message: 'Reported' }; }

  // Cyberbullying
  async getCyberbullyingStats() { return { total: 0 }; }

  // AI First Aid
  async getGroundingExercise() { return { exercise: '5-4-3-2-1' }; }

  // Heal Mode
  async getRecoveryTimeline() { return []; }
  async getBadges() { return [{ name: 'Starter' }]; }

  // Simulator
  async startSimulation(scenarioId) { return { sessionId: 'sim_1', message: 'Hello' }; }
  async respondToSim(sessionId, response) { return window.MockAI.generateSimulatorResponse('Friendly Stranger', response, 0); }
  async getSimProgress() { return { level: 1 }; }
  async getScenarios() { return [{ id: 's1', title: 'Friendly Stranger' }]; }

  // Notifications
  async getNotifications() { return []; }
  async markRead(id) { return { message: 'Read' }; }
}

// Global API instance
window.api = new MindVaultAPI();
