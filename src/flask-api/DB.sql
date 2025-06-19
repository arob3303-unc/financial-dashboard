CREATE DATABASE financial_dashboard;
\c financial_dashboard
CREATE TABLE users (
  id UUID PRIMARY KEY,
  balance NUMERIC DEFAULT 0
);