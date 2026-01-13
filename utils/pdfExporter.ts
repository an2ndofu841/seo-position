import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { KeywordHistory } from '../types';

/**
 * データをページネーションしてPDFに出力する関数
 * @param data 全キーワードデータ
 * @param allMonths 全月リスト
 * @param renderComponent カードを描画するコンポーネント関数
 */
export const exportToPdf = async (
  data: KeywordHistory[],
  allMonths: string[],
  renderContainerId: string
) => {
  if (data.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080], // 16:9 Full HD size
  });

  const pageWidth = 1920;
  const pageHeight = 1080;
  
  // 1ページあたりのカード配置数 (例: 3列 x 2行 = 6枚)
  // レイアウトに合わせて調整
  const cols = 3;
  const rows = 2;
  const itemsPerPage = cols * rows;
  const totalPages = Math.ceil(data.length / itemsPerPage);

  // ページごとのコンテナを取得
  const container = document.getElementById(renderContainerId);
  if (!container) return;

  // 現在のスタイルを保存して、PDF用スタイルを適用
  const originalStyle = container.style.cssText;
  
  // 一時的に表示して描画
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = `${pageWidth}px`;
  container.style.height = `${pageHeight}px`;
  container.style.zIndex = '-1000';
  container.style.backgroundColor = '#f3f4f6'; // gray-100
  container.style.display = 'block';
  container.style.overflow = 'hidden';

  try {
    for (let i = 0; i < totalPages; i++) {
      // データの入れ替え（Reactの状態更新を待つ必要がある場合はアプローチを変えるが、
      // ここではDOMを直接書き換えるか、あるいは全ページ分のHTMLを生成しておいて非表示にする等の方法がある。
      // Reactコンポーネントとしてレンダリングされているものをキャプチャする場合、
      // 画面上の表示とは別に、PDF生成用の不可視コンポーネントを用意し、propでページ番号を渡して
      // useEffect等でレンダリング完了を検知してからキャプチャするのが確実。
      // しかし、ロジック内で完結させるなら、一度に全ページ分のDOMをレンダリングしておくのが早い。
      
      // ここでは、呼び出し元で「全ページ分の非表示DOM」をレンダリングしておき、
      // ページごとにスクロールまたは要素の表示切り替えを行ってキャプチャする方法をとる。
      // または、コンポーネント側でページネーションを制御してもらう。
      
      // 今回は、exportToPdf関数は「指定されたElementをキャプチャする」役割に徹し、
      // 呼び出し元で「全データをページごとに分割した巨大なHTML」を作成してもらい、
      // それをページごとに区切ってキャプチャする方式にするのが現実的。
      
      // ...が、メモリ負荷が高いので、1ページずつレンダリングしてはキャプチャを繰り返すのがベスト。
      // ただしReactの外でDOM操作はしづらいので、
      // 呼び出し元（Pageコンポーネント）の状態（currentPage）を更新しながら進めるのは非同期処理が複雑になる。
      
      // 妥協案: PDF用の全データをレンダリングした隠しコンテナ（ページごとにdivで区切る）を用意し、
      // それぞれのページdivをhtml2canvasでキャプチャする。
    }
  } finally {
    // スタイルを戻す
    container.style.cssText = originalStyle;
    container.style.display = 'none';
  }
};


