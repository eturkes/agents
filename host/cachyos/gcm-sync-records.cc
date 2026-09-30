#include <cstdint>
#include <leveldb/db.h>
#include <leveldb/write_batch.h>
#include <sys/stat.h>
#include <fstream>
#include <iostream>
#include <map>
#include <memory>
#include <stdexcept>
#include <string>
using Records = std::map<std::string, std::string>;
static Records read(leveldb::DB* db) {
  Records records;
  std::unique_ptr<leveldb::Iterator> it(db->NewIterator(leveldb::ReadOptions{}));
  for (it->SeekToFirst(); it->Valid(); it->Next()) records.emplace(it->key().ToString(), it->value().ToString());
  if (!it->status().ok()) throw std::runtime_error(it->status().ToString());
  return records;
}
int main(int argc, char** argv) {
  try {
    if (argc < 3 || argc > 4) throw std::runtime_error("usage: gcm-sync-records DB SNAPSHOT [--apply]");
    const bool apply = argc == 4 && std::string(argv[3]) == "--apply";
    if (argc == 4 && !apply) throw std::runtime_error("unknown option");
    leveldb::Options options; options.create_if_missing = false; options.paranoid_checks = true;
    leveldb::DB* raw = nullptr;
    const auto opened = leveldb::DB::Open(options, argv[1], &raw);
    if (!opened.ok()) throw std::runtime_error(opened.ToString());
    std::unique_ptr<leveldb::DB> db(raw);
    const auto before = read(db.get());
    std::ofstream out(argv[2], std::ios::binary | std::ios::trunc);
    if (!out) throw std::runtime_error("cannot open snapshot");
    chmod(argv[2], 0600);
    for (const auto& [key, value] : before) {
      const uint64_t sizes[] = {key.size(), value.size()};
      out.write(reinterpret_cast<const char*>(sizes), sizeof(sizes));
      out.write(key.data(), key.size()); out.write(value.data(), value.size());
    }
    out.close(); if (!out) throw std::runtime_error("snapshot write failed");
    leveldb::WriteBatch batch; size_t selected = 0; auto expected = before;
    for (const auto& [key, value] : before) {
      (void)value;
      if (key == "iid1-com.google.chrome.sync.invalidations" || key.starts_with("reg1-iid-com.google.chrome.sync.invalidations,")) {
        ++selected; if (apply) {batch.Delete(key); expected.erase(key);}
      }
    }
    if (apply && selected) {
      leveldb::WriteOptions write; write.sync = true;
      const auto status = db->Write(write, &batch);
      if (!status.ok()) throw std::runtime_error(status.ToString());
    }
    if (read(db.get()) != expected) throw std::runtime_error("retained GCM records changed");
    std::cout << "records=" << before.size() << " sync_records=" << selected << " removed=" << (apply ? selected : 0) << " retained_equal=true\n";
    return 0;
  } catch (const std::exception& error) {std::cerr << error.what() << '\n'; return 1;}
}
