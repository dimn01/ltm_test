import styles from "./page.module.scss";

export default function LoginPage() {
    return (
      <div className={styles.login_page}>
          <h1>
            Rainit
          </h1>
          <div>
            <div className={styles.auth_title}>
                로그인
            </div>
            <div>
                <input type="text" placeholder="아이디"/>
            </div>
            <div>
                <input type="password" placeholder="비밀번호"/>
            </div>
            
          </div>
          <div className={styles.login_button}>
            
            로그인
          </div>
      </div>
    );
  }
  