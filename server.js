// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Remove trailing slash if present
    const cleanOrigin = origin?.replace(/\/$/, '');
    const allowedOrigins = [
      'https://cloudapp-frontend-kohl.vercel.app',
      'http://localhost:5173'
    ];
    
    if (!origin || allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ... existing code ... 