package com.LawEZY.user.repository;

import com.LawEZY.user.entity.PlatformTreasury;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlatformTreasuryRepository extends JpaRepository<PlatformTreasury, String> {
}
