# Two-Stage DDM Calculator

A web application for calculating stock valuation using the Two-Stage Dividend Discount Model (DDM), inspired by Mr. Kawin Chookitkasem.

## Features

- **Single Stock Valuation**: Calculate fair price based on D0, Growth (g), Expected Return (ks), and explicit years.
- **Multi-Screening**: Screen multiple stocks at once to find undervalued opportunities.
- **Portfolio Management**: Save interesting stocks to your portfolio for tracking.
- **Price Alerts**: Get notifications via Web and Telegram when stock prices hit MOS (Margin of Safety) levels (30%, 40%, 50%).
- **Growth Assistant**: Helper tool to estimate growth rate (g) using Sustainable Growth Rate or Historical Growth.

## Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/sicomanzer/Two-Stage.git
    cd Two-Stage
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Variables**
    Create a `.env.local` file in the root directory and add your Supabase credentials (optional if hardcoded for development):
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the app**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser.

## Database Schema (Supabase)

Create a table named `portfolio` with the following columns:

- `id`: bigint (Primary Key, Identity)
- `created_at`: timestamptz (Default: now())
- `ticker`: text
- `current_price`: float8
- `fair_price`: float8
- `yield`: float8
- `pe`: float8
- `pbv`: float8
- `mos30_price`: float8
- `mos30_shares`: float8
- `mos30_cost`: float8
- `mos40_price`: float8
- `mos40_shares`: float8
- `mos40_cost`: float8
- `mos50_price`: float8
- `mos50_shares`: float8
- `mos50_cost`: float8

## Telegram Notification Setup

1.  Create a Telegram bot via [@BotFather](https://t.me/BotFather) and get the **Bot Token**.
2.  Find your Chat ID via [@userinfobot](https://t.me/userinfobot).
3.  In the app, click the **Settings** icon and enter your Token and Chat ID.
