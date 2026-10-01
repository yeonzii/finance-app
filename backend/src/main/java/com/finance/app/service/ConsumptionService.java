package com.finance.app.service;

import com.finance.app.entity.CardConsumption;
import com.finance.app.repository.CardConsumptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * FinanceInbox(iCloud Drive) 의 카드문자 txt를 읽어 파싱·저장하고 _processed/ 로 이동.
 */
@Service
@RequiredArgsConstructor
public class ConsumptionService {

    private final CardConsumptionRepository repo;

    // 기본: 아이폰 단축어가 저장하는 iCloud Drive 폴더 (맥 로컬 동기화 경로)
    @Value("${consumption.inbox.dir:#{systemProperties['user.home']}/Library/Mobile Documents/com~apple~CloudDocs/FinanceInbox}")
    private String inboxDir;

    /** 받은편지함(txt) 일괄 적재. 적재 건수 반환. */
    public List<CardConsumption> importInbox() {
        List<CardConsumption> saved = new ArrayList<>();
        Path dir = Paths.get(inboxDir);
        if (!Files.isDirectory(dir)) return saved;

        Path processed = dir.resolve("_processed");
        try { Files.createDirectories(processed); } catch (IOException ignored) {}

        List<Path> files;
        try (var s = Files.list(dir)) {
            files = s.filter(p -> {
                String n = p.getFileName().toString();
                return n.toLowerCase().endsWith(".txt") && !n.equalsIgnoreCase("README.txt");
            }).sorted(Comparator.comparing(p -> p.getFileName().toString())).toList();
        } catch (IOException e) {
            return saved;
        }

        for (Path f : files) {
            String name = f.getFileName().toString();
            if (repo.existsBySourceFile(name)) { move(f, processed); continue; } // 중복 적재 방지
            String raw;
            try { raw = Files.readString(f, StandardCharsets.UTF_8).trim(); }
            catch (IOException e) { continue; }
            if (raw.isEmpty()) { move(f, processed); continue; }

            ConsumptionParser.Parsed p = ConsumptionParser.parse(raw);
            CardConsumption c = new CardConsumption();
            LocalDateTime used = p.usedAt() != null ? p.usedAt() : LocalDateTime.now();
            c.setUsedAt(used);
            c.setYear(used.getYear());
            c.setMonth(used.getMonthValue());
            c.setCardCode(p.cardCode());
            c.setAmount(p.amount());
            c.setMerchant(p.merchant());
            c.setCategoryCode(null); // 소비 카테고리는 화면에서 지정
            c.setRawText(raw);
            c.setSourceFile(name);
            c.setDelYn("N");
            c.setCreatedAt(LocalDateTime.now());
            repo.save(c);
            saved.add(c);
            move(f, processed);
        }
        return saved;
    }

    private void move(Path f, Path processedDir) {
        try {
            Files.move(f, processedDir.resolve(f.getFileName()), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ignored) {}
    }

    public String getInboxDir() { return inboxDir; }
}
