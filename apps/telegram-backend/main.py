import json
import os
import requests
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

load_dotenv()

BACKEND_URL: str = 'http://localhost:3000/api/v1/user'
TOKEN: str = os.getenv('TOKEN')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.message.from_user.id
    response = requests.post(f'{BACKEND_URL}/signup', json={
        "telegram_id": str(telegram_id)
    })
    parsed_response = json.loads(response.content)
    eth_address = parsed_response["ethAddress"]
    sol_address = parsed_response["solanaAddress"]

    keyboard = [
        [
            InlineKeyboardButton("ETH Address", callback_data=f'copy_eth_{eth_address}'),
            InlineKeyboardButton("SOL Address", callback_data=f'copy_sol_{sol_address}')
        ],
        [
            InlineKeyboardButton("ETH Balance", callback_data=f'eth_balance'),
            InlineKeyboardButton("SOL Balance", callback_data=f'sol_balance')
        ],
        [
            InlineKeyboardButton("Export ETH Private Key", callback_data='export_eth_key'),
            InlineKeyboardButton("Export SOL Private Key", callback_data='export_sol_key')
        ],
        [
            InlineKeyboardButton("Show Seed Phrase", callback_data='show_seedphrase')
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Welcome to Jr Wallet - the fastest and most secure bot for Wallet Management", 
        reply_markup=reply_markup
    )

async def handle_button_click(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    if data.startswith('copy_eth_'):
        eth_address = data.split('_', 2)[2]
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f'Ethereum Address: `{eth_address}`',
            parse_mode='MarkdownV2'
        )
    
    elif data.startswith('copy_sol_'):
        sol_address = data.split('_', 2)[2]
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f'Solana Address: `{sol_address}`',
            parse_mode='MarkdownV2'
        )
    
    elif data == 'export_eth_key':
        telegram_id = query.from_user.id
        response = requests.get(f'{BACKEND_URL}/privatekey/ETH/?telegramId={telegram_id}')
        parsed_response = json.loads(response.content)
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f'ETH Private Key: `{parsed_response['privateKey']}`',
            parse_mode='MarkdownV2'
        )
    
    elif data == 'export_sol_key':
        telegram_id = query.from_user.id
        response = requests.get(f'{BACKEND_URL}/privatekey/SOL/?telegramId={telegram_id}')
        parsed_response = json.loads(response.content)
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f'SOL Private Key: `{parsed_response['privateKey']}`',
            parse_mode='MarkdownV2'
        )
    
    elif data == 'show_seedphrase':
        telegram_id = query.from_user.id
        response = requests.get(f'{BACKEND_URL}/seedphrase?telegramId={telegram_id}')
        parsed_response = json.loads(response.content)
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f'Seed Phrase: `{parsed_response['seedphrase']}`',
            parse_mode='MarkdownV2'
        )
    
    elif data == 'eth_balance':
        pass
    
    elif data == 'sol_balance':
        pass


if __name__ == "__main__":
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CallbackQueryHandler(handle_button_click))
    app.run_polling()