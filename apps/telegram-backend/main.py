import json
import os
import requests
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters
)

load_dotenv()

BACKEND_URL: str = 'http://localhost:3000/api/v1'
TOKEN: str = os.getenv('TOKEN')


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    telegram_id = update.message.from_user.id
    response = requests.post(f'{BACKEND_URL}/user/signup', json={
        "telegram_id": str(telegram_id)
    })
    parsed_response = json.loads(response.content)
    eth_address = parsed_response["ethAddress"]
    sol_address = parsed_response["solanaAddress"]

    keyboard = [
        [
            InlineKeyboardButton(
                "ETH Address", callback_data=f'copy_eth_{eth_address}'),
            InlineKeyboardButton(
                "SOL Address", callback_data=f'copy_sol_{sol_address}')
        ],
        [
            InlineKeyboardButton("ETH Balance", callback_data=f'eth_balance'),
            InlineKeyboardButton("SOL Balance", callback_data=f'sol_balance')
        ],
        [
            InlineKeyboardButton("Export ETH Private Key",
                                 callback_data='export_eth_key'),
            InlineKeyboardButton("Export SOL Private Key",
                                 callback_data='export_sol_key')
        ],
        [
            InlineKeyboardButton("Transfer SOL", callback_data='sol_transfer'),
            InlineKeyboardButton("Transfer ETH", callback_data='eth_transfer')
        ],
        [
            InlineKeyboardButton("Show Seed Phrase",
                                 callback_data='show_seedphrase')
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
        response = requests.get(
            f'{BACKEND_URL}/user/privatekey/ETH/?telegramId={telegram_id}')
        parsed_response = json.loads(response.content)
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f'ETH Private Key: `{parsed_response["privateKey"]}`',
            parse_mode='MarkdownV2'
        )

    elif data == 'export_sol_key':
        telegram_id = query.from_user.id
        response = requests.get(
            f'{BACKEND_URL}/user/privatekey/SOL/?telegramId={telegram_id}')
        parsed_response = json.loads(response.content)
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f'SOL Private Key: `{parsed_response["privateKey"]}`',
            parse_mode='MarkdownV2'
        )

    elif data == 'show_seedphrase':
        telegram_id = query.from_user.id
        response = requests.get(
            f'{BACKEND_URL}/user/seedphrase?telegramId={telegram_id}')
        parsed_response = json.loads(response.content)
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f'Seed Phrase: `{parsed_response["seedphrase"]}`',
            parse_mode='MarkdownV2'
        )

    elif data == 'eth_balance':
        telegram_id = query.from_user.id
        await query.message.reply_text("Fetching...")
        response = requests.get(
            f'{BACKEND_URL}/user/balance/ETH/?telegram_id={telegram_id}')
        parsed_response = json.loads(response.content)
        ethbalance = parsed_response['ethbalance']
        await query.message.reply_text(f'Your ETH balance is: {ethbalance}')

    elif data == 'sol_balance':
        telegram_id = query.from_user.id
        await query.message.reply_text("Fetching...")
        response = requests.get(
            f'{BACKEND_URL}/user/balance/SOL/?telegram_id={telegram_id}')
        print(response.content)
        parsed_response = json.loads(response.content)
        solbalance = parsed_response['solbalance']
        await query.message.reply_text(f'Your SOL balance is: {solbalance}')

    elif data == 'sol_transfer':
        await query.message.reply_text("Please enter the recipient's SOL address:")
        context.user_data['waiting_for'] = 'sol_address'

    elif data == 'eth_transfer':
        await query.message.reply_text("Please enter the recipient's ETH address:")
        context.user_data['waiting_for'] = 'eth_address'


async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if 'waiting_for' not in context.user_data:
        return

    if context.user_data['waiting_for'] == 'sol_address':
        context.user_data['sol_address'] = update.message.text
        await update.message.reply_text("Please enter the amount of SOL to transfer:")
        context.user_data['waiting_for'] = 'sol_amount'
        return

    elif context.user_data['waiting_for'] == 'eth_address':
        context.user_data['eth_address'] = update.message.text
        await update.message.reply_text("Please enter the amount of ETH to transfer:")
        context.user_data['waiting_for'] = 'eth_amount'
        return

    elif context.user_data['waiting_for'] == 'sol_amount':
        try:
            amount = float(update.message.text)
            telegram_id = update.message.from_user.id

            response = requests.post(f'{BACKEND_URL}/transfer', json={
                "telegram_id": str(telegram_id),
                "toAddress": context.user_data['sol_address'],
                "amount": amount,
                "type": "SOL"
            })

            parsed_response = json.loads(response.content)
            if response.status_code == 200:
                await update.message.reply_text(
                    text=f'Transaction signature: `{parsed_response["signature"]}`',
                    parse_mode='MarkdownV2'
                )
            else:
                await update.message.reply_text(f"Transfer failed: {parsed_response['message']}")

        except ValueError:
            await update.message.reply_text("Please enter a valid number for the amount")
        except Exception as e:
            await update.message.reply_text(f"An error occurred: {str(e)}")

        context.user_data.clear()
        return

    elif context.user_data['waiting_for'] == 'eth_amount':
        try:
            amount = float(update.message.text)
            telegram_id = update.message.from_user.id

            response = requests.post(f'{BACKEND_URL}/transfer', json={
                "telegram_id": str(telegram_id),
                "toAddress": context.user_data['eth_address'],
                "amount": amount,
                "type": "ETH"
            })
            parsed_response = json.loads(response.content)
            if response.status_code == 200:
                await update.message.reply_text(
                    text=f'Transaction hash: `{parsed_response['hash']}`',
                    parse_mode='MarkdownV2'
                )
            else:
                await update.message.reply_text(f"Transfer failed: {parsed_response['message']}")

        except ValueError:
            await update.message.reply_text("Please enter a valid number for the amount")
        except Exception as e:
            await update.message.reply_text(f"An error occurred: {str(e)}")

        context.user_data.clear()
        return

if __name__ == "__main__":
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CallbackQueryHandler(handle_button_click))
    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND, message_handler))
    app.run_polling()
