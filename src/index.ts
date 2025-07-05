import { Client, GatewayIntentBits, Interaction, REST, Routes, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js'; // ライブラリ
import 'dotenv/config'; // 環境変数の読み込み
import axios from 'axios'; // HTTPリクエストのためのライブラリ
 
// 環境変数からDiscordのBotトークンとクライアントIDを取得
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = '1387052142568669234';

// 環境変数が設定されていない場合のエラーハンドリング
if (!DISCORD_BOT_TOKEN) {
    console.error("エラー: 環境変数 'DISCORD_BOT_TOKEN' が設定されていません。");
    process.exit(1);
}
if (!CLIENT_ID) {
    console.error("エラー: CLIENT_ID が設定されていません。");
    process.exit(1);
}

// Discordクライアントの初期化
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// スラッシュコマンドの定義
const commands = [
    {
        name: 'coolguy',
        description: '画像を表示します',
    },

    new SlashCommandBuilder()
        .setName('weather')
        .setDescription('指定した都市の天気予報を表示します')
        .addStringOption(option =>
            option.setName('city')
                .setDescription('例：edinburgh')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('sendmessage')
        .setDescription('複数行のメッセージをフォームで送信します')
        .toJSON(),
];

// Botがログインしたときのイベントリスナー
client.once('ready', async () => {
    console.log(`Botがログインしました: ${client.user?.tag}`);
    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN as string);

    try {
        console.log('スラッシュコマンドの登録を開始します...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('スラッシュコマンドが正常に登録されました。');
    } catch (error) {
        console.error('スラッシュコマンドの登録中にエラーが発生しました:', error);
    }
});

// インタラクションの処理
client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        if (commandName === 'coolguy') {
            const filePath = 'images/coolguy.jpeg';
            await interaction.reply({ files: [filePath] });
        } 
        else if (commandName === 'weather') {
            if (!interaction.isChatInputCommand()) {
                console.error('weather コマンドがチャット入力コマンドとして実行されませんでした。');
                return;
            }
            await interaction.deferReply();
            const city = interaction.options.getString('city', true);

            const weatherApiUrl = `https://wttr.in/${encodeURIComponent(city)}?lang=ja&format=%l:+%t,+%c+%C%0D%0A降水量:%P%0D%0A風速:%w%0D%0A湿度:%h%0D%0A天気:%x`;

            try {
                const response = await axios.get(weatherApiUrl);
                const weatherText = response.data;

                await interaction.editReply(`**${city}** の天気予報:\n\`\`\`\n${weatherText}\n\`\`\``);
            } catch (error) {
                console.error('天気予報の取得中にエラーが発生しました:', error);
                await interaction.editReply('天気予報の取得に失敗しました。都市名が正しいか確認してください。');
            }
        }
        else if (commandName === 'sendmessage') {
            if (!interaction.isChatInputCommand()) {
                console.error('sendmessage コマンドがチャット入力コマンドとして実行されませんでした。');
                return;
            }

            const message = new ModalBuilder()
                .setCustomId('multilineMessage')
                .setTitle('メッセージを入力してください');

            const sendTime = new TextInputBuilder()
                .setCustomId('timeInput')
                .setLabel("送信時間を入力してください")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('ここに送信時間を入力してください...（例）2025/12/30/12:00');

            const multiLineInput = new TextInputBuilder()
                .setCustomId('multilineMessageInput')
                .setLabel("複数行のメッセージ")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('ここにメッセージを入力してください...');

            const actionRowMessage = new ActionRowBuilder<TextInputBuilder>().addComponents(multiLineInput);
            const actionRowTime = new ActionRowBuilder<TextInputBuilder>().addComponents(sendTime);
            message.addComponents(actionRowMessage);
            message.addComponents(actionRowTime);
            await interaction.showModal(message);
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'multilineMessage') { 
            await interaction.deferReply({ ephemeral: false }); //ephemeralがfalseの時に，コマンド使用者以外にもコマンド実行中のメッセージが見えるらしい　trueの時はそれが見えなくなるが，送りたいメッセージも見えなくなる
            const inputTime = interaction.fields.getTextInputValue('timeInput');
            const delayTime = new Date(inputTime);
            const currentTime = new Date();
            const delayMilliseconds = delayTime.getTime() - currentTime.getTime();

            if (isNaN(delayTime.getTime()) || delayMilliseconds < 0) {
                await interaction.editReply('送信時間が無効です。正しい形式で未来の日時を入力してください。');
                return;
            }

            setTimeout(async () => {
                const delayMessage = interaction.fields.getTextInputValue('multilineMessageInput');
                await interaction.editReply(`<@${interaction.user.id}>からのメッセージだにゅう〜\n---------------\n${delayMessage}`);
            }, delayMilliseconds);
            
        }
    }
});

// Botのログイン
client.login(DISCORD_BOT_TOKEN);