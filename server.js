// CORS configuration
app.use(cors({
  origin: 'https://cloudapp-frontend-kohl.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add additional headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://cloudapp-frontend-kohl.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// ... existing code ... 