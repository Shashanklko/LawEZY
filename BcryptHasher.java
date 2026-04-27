import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class BcryptHasher {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = args.length > 0 ? args[0] : "Abhinav123";
        System.out.println(encoder.encode(password));
    }
}
